/*==============================================================================
Economic Data Preprocessing Script
File: data/scripts/data_preprocessing.do

Purpose: Import, clean, manipulate, and export processed economic datasets
Input: CSV files from data/raw/
Output: Cleaned CSV/DTA files to data/processed/

Variables:
- Date: date variable
- Inflation_Rate, GDP, Consumption, Investment, Government_Spending: numeric
- Net_Exports, Government_Revenue, Expenditure, Fiscal_Deficit: numeric

Author: Economic Analysis Team
Date: Created for data preprocessing pipeline
==============================================================================*/

clear all
set more off
version 16

// Set working directory and paths
global root_path "."
global raw_path "$root_path/data/raw"
global processed_path "$root_path/data/processed"
global scripts_path "$root_path/data/scripts"

// Create processed data directory if it doesn't exist
capture mkdir "$processed_path"

// Define log file
local logfile "$processed_path/preprocessing_log.txt"
log using "`logfile'", replace text

display "========================================"
display "Economic Data Preprocessing Pipeline"
display "Started: " c(current_date) " " c(current_time)
display "========================================"

/*==============================================================================
PROGRAM: CLEAN_ECONOMIC_DATA
Purpose: Main data cleaning and preprocessing routine
==============================================================================*/

capture program drop clean_economic_data
program define clean_economic_data
    syntax, inputfile(string) [outputfile(string)] [method(string)]
    
    // Set default values
    if "`outputfile'" == "" {
        local outputfile = "processed_" + "`inputfile'"
    }
    if "`method'" == "" {
        local method = "interpolate"
    }
    
    display ""
    display "Processing: `inputfile'"
    display "Output: `outputfile'"
    display "Missing value method: `method'"
    display "----------------------------------------"
    
    // Clear any existing data
    clear
    
    // Load raw data
    capture import delimited "$raw_path/`inputfile'", clear
    if _rc != 0 {
        display as error "Error: Could not load `inputfile'"
        exit _rc
    }
    
    local original_obs = _N
    display "Loaded `original_obs' observations"
    
    // Clean and validate date variable
    capture confirm variable date
    if _rc == 0 {
        // Convert date variable to STATA date format
        capture gen date_temp = date(date, "YMD")
        if _rc != 0 {
            capture gen date_temp = date(date, "MDY")
        }
        if _rc != 0 {
            capture gen date_temp = date(date, "DMY")
        }
        
        // If still unsuccessful, create sequence of dates
        if _rc != 0 {
            display as warning "Could not parse dates. Creating sequential monthly dates."
            gen date_temp = monthly("2020m1", "YM") + _n - 1
            format date_temp %tm
        } else {
            format date_temp %td
        }
        
        drop date
        rename date_temp date
        
        // Remove observations with missing dates
        local missing_dates = sum(missing(date))
        if `missing_dates' > 0 {
            display as warning "Dropping `missing_dates' observations with missing dates"
            drop if missing(date)
        }
        
        // Sort by date
        sort date
    } else {
        display as warning "Date variable not found. Creating sequential dates."
        gen date = monthly("2020m1", "YM") + _n - 1
        format date %tm
        sort date
    }
    
    // Define numeric variables for cleaning
    local numeric_vars inflation_rate gdp consumption investment government_spending ///
                      net_exports government_revenue expenditure fiscal_deficit
    
    // Clean numeric variables
    foreach var of local numeric_vars {
        capture confirm variable `var'
        if _rc == 0 {
            // Convert to numeric, replacing non-numeric values with missing
            destring `var', replace force
            
            // Count missing values
            local missing_count = sum(missing(`var'))
            if `missing_count' > 0 {
                display "`var': `missing_count' missing values detected"
            }
            
            // Identify and flag outliers (beyond 3 standard deviations)
            quietly summarize `var'
            if !missing(r(sd)) & r(sd) > 0 {
                local mean_val = r(mean)
                local sd_val = r(sd)
                local threshold = 3 * `sd_val'
                
                gen outlier_`var' = abs(`var' - `mean_val') > `threshold' & !missing(`var')
                local outlier_count = sum(outlier_`var')
                
                if `outlier_count' > 0 {
                    display as warning "`var': `outlier_count' potential outliers detected"
                }
            }
        } else {
            display as warning "Variable `var' not found in dataset"
        }
    }
    
    // Handle missing values based on specified method
    display "Handling missing values using method: `method'"
    
    foreach var of local numeric_vars {
        capture confirm variable `var'
        if _rc == 0 {
            if "`method'" == "interpolate" {
                // Linear interpolation
                ipolate `var' date, gen(`var'_temp)
                replace `var' = `var'_temp if missing(`var') & !missing(`var'_temp)
                drop `var'_temp
            }
            else if "`method'" == "forward_fill" {
                // Forward fill (carry last observation forward)
                by date: replace `var' = `var'[_n-1] if missing(`var') & _n > 1
            }
            else if "`method'" == "mean" {
                // Replace with mean
                quietly summarize `var'
                replace `var' = r(mean) if missing(`var')
            }
            else if "`method'" == "median" {
                // Replace with median
                quietly summarize `var', detail
                replace `var' = r(p50) if missing(`var')
            }
        }
    }
    
    // Validate economic relationships
    display "Validating economic relationships..."
    
    // Check GDP accounting identity: GDP = C + I + G + NX
    capture {
        confirm variable gdp consumption investment government_spending net_exports
        gen gdp_components_sum = consumption + investment + government_spending + net_exports
        gen gdp_diff = abs(gdp - gdp_components_sum)
        gen gdp_tolerance = 0.05 * abs(gdp)
        gen gdp_inconsistent = gdp_diff > gdp_tolerance & !missing(gdp_diff, gdp_tolerance)
        
        local inconsistent_gdp = sum(gdp_inconsistent)
        if `inconsistent_gdp' > 0 {
            display as warning "GDP components don't sum to GDP in `inconsistent_gdp' observations"
        }
    }
    
    // Check fiscal deficit calculation: Deficit = Expenditure - Revenue
    capture {
        confirm variable fiscal_deficit government_revenue expenditure
        gen calculated_deficit = expenditure - government_revenue
        gen deficit_diff = abs(fiscal_deficit - calculated_deficit)
        gen deficit_tolerance = 0.01 * abs(expenditure)
        gen deficit_inconsistent = deficit_diff > deficit_tolerance & !missing(deficit_diff, deficit_tolerance)
        
        local inconsistent_deficit = sum(deficit_inconsistent)
        if `inconsistent_deficit' > 0 {
            display as warning "Fiscal deficit calculation inconsistent in `inconsistent_deficit' observations"
        }
    }
    
    // Check for negative values in variables that should be positive
    local positive_vars gdp consumption investment government_spending government_revenue expenditure
    foreach var of local positive_vars {
        capture confirm variable `var'
        if _rc == 0 {
            local negative_count = sum(`var' < 0 & !missing(`var'))
            if `negative_count' > 0 {
                display as warning "`var' has `negative_count' negative values"
            }
        }
    }
    
    // Add derived variables
    display "Adding derived economic indicators..."
    
    // GDP growth rate (year-over-year)
    capture {
        confirm variable gdp
        sort date
        gen gdp_growth_rate = ((gdp / L12.gdp) - 1) * 100 if !missing(gdp, L12.gdp)
        label variable gdp_growth_rate "GDP Growth Rate (YoY %)"
    }
    
    // Fiscal balance as percentage of GDP
    capture {
        confirm variable fiscal_deficit gdp
        gen fiscal_balance_gdp_ratio = (fiscal_deficit / gdp) * 100
        label variable fiscal_balance_gdp_ratio "Fiscal Balance as % of GDP"
    }
    
    // Government spending as percentage of GDP
    capture {
        confirm variable government_spending gdp
        gen gov_spending_gdp_ratio = (government_spending / gdp) * 100
        label variable gov_spending_gdp_ratio "Government Spending as % of GDP"
    }
    
    // Real GDP (inflation-adjusted)
    capture {
        confirm variable gdp inflation_rate
        sort date
        gen price_index = 100
        replace price_index = price_index[_n-1] * (1 + inflation_rate/100) if _n > 1 & !missing(inflation_rate)
        gen real_gdp = gdp / (price_index / 100)
        label variable real_gdp "Real GDP (Base Year = 100)"
        label variable price_index "Price Index (Base Year = 100)"
    }
    
    // Clean up temporary validation variables
    capture drop *_temp *_inconsistent *_tolerance *_diff *_components_sum calculated_deficit
    capture drop outlier_*
    
    // Generate summary statistics
    display ""
    display "Summary Statistics:"
    display "==================="
    quietly summarize
    display "Dataset contains " _N " observations and " r(k) " variables"
    
    quietly summarize date
    local min_date = r(min)
    local max_date = r(max)
    display "Date range: " %td `min_date' " to " %td `max_date'
    
    // Display summary for key economic variables
    local key_vars gdp inflation_rate consumption investment
    foreach var of local key_vars {
        capture confirm variable `var'
        if _rc == 0 {
            quietly summarize `var'
            display "`var': Mean = " %9.2f r(mean) ", SD = " %9.2f r(sd) ", N = " r(N)
        }
    }
    
    // Export processed data
    display ""
    display "Exporting processed data..."
    
    // Export as CSV
    local csv_output = subinstr("`outputfile'", ".dta", ".csv", 1)
    if !strpos("`csv_output'", ".csv") {
        local csv_output = "`csv_output'.csv"
    }
    export delimited "$processed_path/`csv_output'", replace
    display "CSV exported to: $processed_path/`csv_output'"
    
    // Optional: Export as STATA .dta file
    local dta_output = subinstr("`outputfile'", ".csv", ".dta", 1)
    if !strpos("`dta_output'", ".dta") {
        local dta_output = "`dta_output'.dta"
    }
    save "$processed_path/`dta_output'", replace
    display "DTA file saved to: $processed_path/`dta_output'"
    
    display "Processing completed successfully for `inputfile'"
    display ""
end

/*==============================================================================
PROGRAM: PROCESS_MULTIPLE_DATASETS
Purpose: Process multiple datasets in batch
==============================================================================*/

capture program drop process_multiple_datasets
program define process_multiple_datasets
    syntax, files(string) [method(string)]
    
    if "`method'" == "" {
        local method = "interpolate"
    }
    
    display "Processing multiple datasets with method: `method'"
    display "Files to process: `files'"
    
    local file_count = 0
    local success_count = 0
    
    foreach file of local files {
        local file_count = `file_count' + 1
        display ""
        display "=========================================="
        display "Processing file `file_count': `file'"
        display "=========================================="
        
        capture clean_economic_data, inputfile("`file'") method("`method'")
        if _rc == 0 {
            local success_count = `success_count' + 1
            display "Successfully processed: `file'"
        } else {
            display as error "Failed to process: `file'"
        }
    }
    
    display ""
    display "=========================================="
    display "Batch Processing Summary"
    display "=========================================="
    display "Total files: `file_count'"
    display "Successfully processed: `success_count'"
    display "Failed: " `file_count' - `success_count'
end

/*==============================================================================
MAIN EXECUTION
==============================================================================*/

// Example usage: Process individual datasets
display "Starting individual dataset processing..."

// Process main economic dataset
capture clean_economic_data, inputfile("economic_data.csv") outputfile("processed_economic_data.csv")

// Process quarterly GDP data
capture clean_economic_data, inputfile("quarterly_gdp.csv") outputfile("processed_quarterly_gdp.csv") method("forward_fill")

// Process fiscal indicators
capture clean_economic_data, inputfile("fiscal_indicators.csv") outputfile("processed_fiscal_indicators.csv") method("interpolate")

// Example usage: Batch processing
display ""
display "Starting batch processing..."
local dataset_list "economic_data.csv quarterly_gdp.csv fiscal_indicators.csv"
process_multiple_datasets, files("`dataset_list'") method("interpolate")

/*==============================================================================
UTILITY PROGRAMS
==============================================================================*/

// Program to check data quality after processing
capture program drop check_data_quality
program define check_data_quality
    syntax varlist
    
    display ""
    display "Data Quality Check"
    display "=================="
    
    foreach var of local varlist {
        quietly count if missing(`var')
        local missing_count = r(N)
        quietly count
        local total_count = r(N)
        local missing_pct = (`missing_count' / `total_count') * 100
        
        display "`var': " `missing_count' "/" `total_count' " missing (" %4.1f `missing_pct' "%)"
    }
end

// Program to generate correlation matrix for key variables
capture program drop correlation_analysis
program define correlation_analysis
    syntax varlist
    
    display ""
    display "Correlation Analysis"
    display "==================="
    
    correlate `varlist'
end

/*==============================================================================
FINAL CLEANUP AND SUMMARY
==============================================================================*/

display ""
display "========================================"
display "Preprocessing Pipeline Completed"
display "Finished: " c(current_date) " " c(current_time)
display "========================================"

// Close log file
log close

// Display completion message
display ""
display "All preprocessing tasks completed successfully!"
display "Log file saved to: $processed_path/preprocessing_log.txt"
display "Processed files available in: $processed_path/"

// Optional: Load and display summary of final processed dataset
capture use "$processed_path/processed_economic_data.dta", clear
if _rc == 0 {
    display ""
    display "Sample of processed data:"
    list in 1/5
}