# Economic Data Preprocessing Script
# File: data/scripts/data_preprocessing.R
# 
# Purpose: Import, tidy, process, and export economic datasets
# Libraries: tidyverse (readr, dplyr, tidyr)
# Input: CSV files from data/raw/
# Output: Cleaned CSV to data/processed/

# Load required libraries
library(tidyverse)
library(lubridate)
library(here)

# Set up logging function
log_message <- function(message, level = "INFO") {
  timestamp <- format(Sys.time(), "%Y-%m-%d %H:%M:%S")
  cat(sprintf("[%s] %s: %s\n", timestamp, level, message))
}

# Define EconomicDataPreprocessor class (using R6 for OOP approach)
library(R6)

EconomicDataPreprocessor <- R6Class("EconomicDataPreprocessor",
  public = list(
    raw_data_path = NULL,
    processed_data_path = NULL,
    expected_columns = NULL,
    
    # Initialize the preprocessor
    initialize = function(raw_data_path = "data/raw/", processed_data_path = "data/processed/") {
      self$raw_data_path <- raw_data_path
      self$processed_data_path <- processed_data_path
      
      # Create output directory if it doesn't exist
      if (!dir.exists(self$processed_data_path)) {
        dir.create(self$processed_data_path, recursive = TRUE)
      }
      
      # Define expected columns and their types
      self$expected_columns <- list(
        Date = "Date",
        Inflation_Rate = "numeric",
        GDP = "numeric",
        Consumption = "numeric",
        Investment = "numeric",
        Government_Spending = "numeric",
        Net_Exports = "numeric",
        Government_Revenue = "numeric",
        Expenditure = "numeric",
        Fiscal_Deficit = "numeric"
      )
      
      log_message("EconomicDataPreprocessor initialized")
    },
    
    # Load raw CSV data
    load_raw_data = function(filename) {
      tryCatch({
        filepath <- file.path(self$raw_data_path, filename)
        log_message(paste("Loading data from", filepath))
        
        df <- read_csv(filepath, show_col_types = FALSE)
        log_message(paste("Successfully loaded", nrow(df), "rows from", filename))
        
        return(df)
      }, error = function(e) {
        log_message(paste("Error loading", filename, ":", e$message), "ERROR")
        return(NULL)
      })
    },
    
    # Clean and standardize the Date column
    clean_date_column = function(df) {
      log_message("Cleaning Date column...")
      
      if (!"Date" %in% colnames(df)) {
        log_message("Date column not found. Creating dummy dates.", "WARNING")
        df <- df %>%
          mutate(Date = seq(as.Date("2020-01-01"), 
                           by = "month", 
                           length.out = nrow(.)))
      } else {
        # Convert to Date, handling various formats
        df <- df %>%
          mutate(Date = as.Date(Date, tryFormats = c("%Y-%m-%d", "%m/%d/%Y", "%d/%m/%Y")))
        
        # Remove rows with invalid dates
        invalid_dates <- sum(is.na(df$Date))
        if (invalid_dates > 0) {
          log_message(paste("Removing", invalid_dates, "rows with invalid dates"), "WARNING")
          df <- df %>% filter(!is.na(Date))
        }
      }
      
      # Sort by date and reset row numbers
      df <- df %>%
        arrange(Date) %>%
        mutate(row_number = row_number()) %>%
        select(-row_number)
      
      return(df)
    },
    
    # Clean and validate numeric columns
    clean_numeric_columns = function(df) {
      log_message("Cleaning numeric columns...")
      
      numeric_columns <- names(self$expected_columns)[names(self$expected_columns) != "Date"]
      
      for (col in numeric_columns) {
        if (col %in% colnames(df)) {
          # Convert to numeric, replacing invalid values with NA
          df <- df %>%
            mutate(!!col := as.numeric(.data[[col]]))
          
          # Log missing values
          missing_count <- sum(is.na(df[[col]]))
          if (missing_count > 0) {
            log_message(paste(col, ":", missing_count, "missing values detected"))
          }
          
          # Handle outliers (values beyond 3 standard deviations)
          if (!all(is.na(df[[col]]))) {
            mean_val <- mean(df[[col]], na.rm = TRUE)
            std_val <- sd(df[[col]], na.rm = TRUE)
            outlier_threshold <- 3 * std_val
            
            outliers <- abs(df[[col]] - mean_val) > outlier_threshold
            outlier_count <- sum(outliers, na.rm = TRUE)
            
            if (outlier_count > 0) {
              log_message(paste(col, ":", outlier_count, "potential outliers detected"), "WARNING")
            }
          }
        } else {
          log_message(paste("Expected column '", col, "' not found in data"), "WARNING")
        }
      }
      
      return(df)
    },
    
    # Handle missing values in the dataset
    handle_missing_values = function(df, method = "interpolate") {
      log_message(paste("Handling missing values using method:", method))
      
      numeric_columns <- df %>%
        select(where(is.numeric)) %>%
        colnames()
      
      if (method == "interpolate") {
        # Linear interpolation for time series data
        df <- df %>%
          arrange(Date) %>%
          mutate(across(all_of(numeric_columns), ~ approx(seq_along(.), ., seq_along(.), rule = 2)$y))
      } else if (method == "forward_fill") {
        df <- df %>%
          arrange(Date) %>%
          fill(all_of(numeric_columns), .direction = "down")
      } else if (method == "backward_fill") {
        df <- df %>%
          arrange(Date) %>%
          fill(all_of(numeric_columns), .direction = "up")
      } else if (method == "mean") {
        df <- df %>%
          mutate(across(all_of(numeric_columns), ~ ifelse(is.na(.), mean(., na.rm = TRUE), .)))
      } else if (method == "median") {
        df <- df %>%
          mutate(across(all_of(numeric_columns), ~ ifelse(is.na(.), median(., na.rm = TRUE), .)))
      } else {
        log_message(paste("Unknown method '", method, "'. Using interpolation."), "WARNING")
        df <- df %>%
          arrange(Date) %>%
          mutate(across(all_of(numeric_columns), ~ approx(seq_along(.), ., seq_along(.), rule = 2)$y))
      }
      
      return(df)
    },
    
    # Validate logical relationships between economic variables
    validate_economic_relationships = function(df) {
      log_message("Validating economic relationships...")
      
      issues <- character(0)
      
      # Check if GDP components sum correctly (within reasonable tolerance)
      gdp_components <- c("GDP", "Consumption", "Investment", "Government_Spending", "Net_Exports")
      if (all(gdp_components %in% colnames(df))) {
        df_validation <- df %>%
          mutate(
            gdp_components_sum = Consumption + Investment + Government_Spending + Net_Exports,
            gdp_diff = abs(GDP - gdp_components_sum),
            tolerance = 0.05 * abs(GDP),
            inconsistent = gdp_diff > tolerance
          )
        
        inconsistent_count <- sum(df_validation$inconsistent, na.rm = TRUE)
        if (inconsistent_count > 0) {
          issues <- c(issues, paste("GDP components don't sum to GDP in", inconsistent_count, "rows"))
        }
      }
      
      # Check fiscal deficit calculation
      fiscal_columns <- c("Fiscal_Deficit", "Government_Revenue", "Expenditure")
      if (all(fiscal_columns %in% colnames(df))) {
        df_fiscal <- df %>%
          mutate(
            calculated_deficit = Expenditure - Government_Revenue,
            deficit_diff = abs(Fiscal_Deficit - calculated_deficit),
            tolerance = 0.01 * abs(Expenditure),
            inconsistent_deficit = deficit_diff > tolerance
          )
        
        inconsistent_count <- sum(df_fiscal$inconsistent_deficit, na.rm = TRUE)
        if (inconsistent_count > 0) {
          issues <- c(issues, paste("Fiscal deficit calculation inconsistent in", inconsistent_count, "rows"))
        }
      }
      
      # Check for negative values where they shouldn't occur
      positive_columns <- c("GDP", "Consumption", "Investment", "Government_Spending", 
                           "Government_Revenue", "Expenditure")
      
      for (col in positive_columns) {
        if (col %in% colnames(df)) {
          negative_count <- sum(df[[col]] < 0, na.rm = TRUE)
          if (negative_count > 0) {
            issues <- c(issues, paste(col, "has", negative_count, "negative values"))
          }
        }
      }
      
      if (length(issues) > 0) {
        log_message("Validation issues found:", "WARNING")
        for (issue in issues) {
          log_message(paste("  -", issue), "WARNING")
        }
      } else {
        log_message("All economic relationships validated successfully")
      }
      
      return(list(data = df, issues = issues))
    },
    
    # Add derived economic indicators
    add_derived_variables = function(df) {
      log_message("Adding derived variables...")
      
      df <- df %>%
        arrange(Date) %>%
        mutate(
          # GDP growth rate (year-over-year)
          GDP_Growth_Rate = ifelse("GDP" %in% colnames(.) & nrow(.) > 12,
                                  (GDP / lag(GDP, 12) - 1) * 100,
                                  NA_real_),
          
          # Fiscal balance as percentage of GDP
          Fiscal_Balance_GDP_Ratio = ifelse(all(c("Fiscal_Deficit", "GDP") %in% colnames(.)),
                                           (Fiscal_Deficit / GDP) * 100,
                                           NA_real_),
          
          # Government spending as percentage of GDP
          Gov_Spending_GDP_Ratio = ifelse(all(c("Government_Spending", "GDP") %in% colnames(.)),
                                         (Government_Spending / GDP) * 100,
                                         NA_real_)
        )
      
      # Real GDP (inflation-adjusted)
      if (all(c("GDP", "Inflation_Rate") %in% colnames(df))) {
        df <- df %>%
          mutate(
            Price_Index = 100 * cumprod(1 + Inflation_Rate/100),
            Real_GDP = GDP / (Price_Index / 100)
          )
      }
      
      return(df)
    },
    
    # Generate and log summary statistics
    generate_summary_statistics = function(df) {
      log_message("Generating summary statistics...")
      
      numeric_summary <- df %>%
        select(where(is.numeric)) %>%
        summary()
      
      log_message(paste("Dataset shape:", nrow(df), "x", ncol(df)))
      log_message(paste("Date range:", min(df$Date, na.rm = TRUE), "to", max(df$Date, na.rm = TRUE)))
      log_message("Summary statistics generated")
      
      return(numeric_summary)
    },
    
    # Export cleaned data to processed directory
    export_processed_data = function(df, filename) {
      tryCatch({
        filepath <- file.path(self$processed_data_path, filename)
        write_csv(df, filepath)
        log_message(paste("Processed data exported to", filepath))
        return(TRUE)
      }, error = function(e) {
        log_message(paste("Error exporting data:", e$message), "ERROR")
        return(FALSE)
      })
    },
    
    # Main processing pipeline for economic datasets
    process_dataset = function(input_filename, output_filename = NULL, 
                              missing_value_method = "interpolate") {
      if (is.null(output_filename)) {
        output_filename <- paste0("processed_", input_filename)
      }
      
      log_message(paste("Starting data preprocessing for", input_filename))
      
      # Load raw data
      df <- self$load_raw_data(input_filename)
      if (is.null(df)) {
        return(NULL)
      }
      
      # Data cleaning pipeline
      df <- self$clean_date_column(df)
      df <- self$clean_numeric_columns(df)
      df <- self$handle_missing_values(df, method = missing_value_method)
      
      # Validation and enhancement
      validation_result <- self$validate_economic_relationships(df)
      df <- validation_result$data
      df <- self$add_derived_variables(df)
      
      # Generate summary
      summary_stats <- self$generate_summary_statistics(df)
      
      # Export processed data
      if (self$export_processed_data(df, output_filename)) {
        log_message("Data preprocessing completed successfully")
      } else {
        log_message("Failed to export processed data", "ERROR")
      }
      
      return(df)
    }
  )
)

# Functional approach alternative (without OOP)
preprocess_economic_data <- function(input_filename, 
                                   raw_data_path = "data/raw/", 
                                   processed_data_path = "data/processed/",
                                   output_filename = NULL,
                                   missing_value_method = "interpolate") {
  
  # Set output filename if not provided
  if (is.null(output_filename)) {
    output_filename <- paste0("processed_", input_filename)
  }
  
  # Create output directory if it doesn't exist
  if (!dir.exists(processed_data_path)) {
    dir.create(processed_data_path, recursive = TRUE)
  }
  
  # Load and process data using tidyverse pipeline
  processed_data <- file.path(raw_data_path, input_filename) %>%
    read_csv(show_col_types = FALSE) %>%
    
    # Clean date column
    mutate(Date = case_when(
      is.na(as.Date(Date, tryFormats = c("%Y-%m-%d", "%m/%d/%Y", "%d/%m/%Y"))) ~ 
        seq(as.Date("2020-01-01"), by = "month", length.out = n())[row_number()],
      TRUE ~ as.Date(Date, tryFormats = c("%Y-%m-%d", "%m/%d/%Y", "%d/%m/%Y"))
    )) %>%
    
    # Convert numeric columns
    mutate(across(c(Inflation_Rate, GDP, Consumption, Investment, Government_Spending, 
                   Net_Exports, Government_Revenue, Expenditure, Fiscal_Deficit), 
                 ~ as.numeric(.))) %>%
    
    # Handle missing values based on method
    {if (missing_value_method == "interpolate") {
       arrange(., Date) %>%
       mutate(across(where(is.numeric), ~ approx(seq_along(.), ., seq_along(.), rule = 2)$y))
     } else if (missing_value_method == "forward_fill") {
       arrange(., Date) %>%
       fill(where(is.numeric), .direction = "down")
     } else if (missing_value_method == "mean") {
       mutate(across(where(is.numeric), ~ ifelse(is.na(.), mean(., na.rm = TRUE), .)))
     } else {
       .
     }} %>%
    
    # Add derived variables
    mutate(
      GDP_Growth_Rate = (GDP / lag(GDP, 12) - 1) * 100,
      Fiscal_Balance_GDP_Ratio = (Fiscal_Deficit / GDP) * 100,
      Gov_Spending_GDP_Ratio = (Government_Spending / GDP) * 100,
      Price_Index = 100 * cumprod(1 + Inflation_Rate/100),
      Real_GDP = GDP / (Price_Index / 100)
    ) %>%
    
    # Final arrangement
    arrange(Date)
  
  # Export processed data
  write_csv(processed_data, file.path(processed_data_path, output_filename))
  
  log_message(paste("Processed", input_filename, "and exported to", output_filename))
  
  return(processed_data)
}

# Main execution function
main <- function() {
  log_message("Starting economic data preprocessing pipeline")
  
  # Initialize preprocessor (OOP approach)
  preprocessor <- EconomicDataPreprocessor$new()
  
  # Example datasets to process
  datasets_to_process <- c(
    "economic_data.csv",
    "quarterly_gdp.csv", 
    "fiscal_indicators.csv"
  )
  
  processed_datasets <- list()
  
  for (dataset in datasets_to_process) {
    log_message(paste(rep("=", 50), collapse = ""))
    log_message(paste("Processing", dataset))
    log_message(paste(rep("=", 50), collapse = ""))
    
    df <- preprocessor$process_dataset(dataset)
    if (!is.null(df)) {
      processed_datasets[[dataset]] <- df
    }
  }
  
  log_message(paste("Processed", length(processed_datasets), "datasets successfully"))
  
  return(processed_datasets)
}

# Alternative functional approach for single dataset
process_single_dataset <- function(filename) {
  preprocess_economic_data(filename)
}

# Run main function if script is executed directly
if (!interactive()) {
  main()
}