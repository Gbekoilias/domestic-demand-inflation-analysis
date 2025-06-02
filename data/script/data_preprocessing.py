"""
Economic Data Preprocessing Script
File: data/scripts/data_preprocessing.py

Purpose: Import, clean, and export processed economic datasets
Libraries: Pandas, NumPy
Input: CSV files from data/raw/
Output: Cleaned CSV to data/processed/
"""

import pandas as pd
import numpy as np
import os
from datetime import datetime
import logging

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class EconomicDataPreprocessor:
    """
    A class to handle preprocessing of economic data including GDP, inflation,
    fiscal indicators, and macroeconomic components.
    """
    
    def __init__(self, raw_data_path='data/raw/', processed_data_path='data/processed/'):
        self.raw_data_path = raw_data_path
        self.processed_data_path = processed_data_path
        
        # Ensure output directory exists
        os.makedirs(self.processed_data_path, exist_ok=True)
        
        # Define expected columns and their data types
        self.expected_columns = {
            'Date': 'datetime64[ns]',
            'Inflation_Rate': 'float64',
            'GDP': 'float64',
            'Consumption': 'float64',
            'Investment': 'float64',
            'Government_Spending': 'float64',
            'Net_Exports': 'float64',
            'Government_Revenue': 'float64',
            'Expenditure': 'float64',
            'Fiscal_Deficit': 'float64'
        }
    
    def load_raw_data(self, filename):
        """Load raw CSV data from the specified file."""
        try:
            filepath = os.path.join(self.raw_data_path, filename)
            logger.info(f"Loading data from {filepath}")
            
            df = pd.read_csv(filepath)
            logger.info(f"Successfully loaded {len(df)} rows from {filename}")
            return df
        
        except FileNotFoundError:
            logger.error(f"File {filename} not found in {self.raw_data_path}")
            return None
        except Exception as e:
            logger.error(f"Error loading {filename}: {str(e)}")
            return None
    
    def clean_date_column(self, df):
        """Clean and standardize the Date column."""
        logger.info("Cleaning Date column...")
        
        if 'Date' not in df.columns:
            logger.warning("Date column not found. Creating dummy dates.")
            df['Date'] = pd.date_range(start='2020-01-01', periods=len(df), freq='M')
        else:
            # Convert to datetime, handling various formats
            df['Date'] = pd.to_datetime(df['Date'], errors='coerce', infer_datetime_format=True)
            
            # Remove rows with invalid dates
            invalid_dates = df['Date'].isna().sum()
            if invalid_dates > 0:
                logger.warning(f"Removing {invalid_dates} rows with invalid dates")
                df = df.dropna(subset=['Date'])
        
        return df.sort_values('Date').reset_index(drop=True)
    
    def clean_numeric_columns(self, df):
        """Clean and validate numeric columns."""
        logger.info("Cleaning numeric columns...")
        
        numeric_columns = [col for col in self.expected_columns.keys() if col != 'Date']
        
        for col in numeric_columns:
            if col in df.columns:
                # Convert to numeric, replacing invalid values with NaN
                df[col] = pd.to_numeric(df[col], errors='coerce')
                
                # Log missing values
                missing_count = df[col].isna().sum()
                if missing_count > 0:
                    logger.info(f"{col}: {missing_count} missing values detected")
                
                # Handle outliers (values beyond 3 standard deviations)
                if not df[col].isna().all():
                    mean_val = df[col].mean()
                    std_val = df[col].std()
                    outlier_threshold = 3 * std_val
                    
                    outliers = np.abs(df[col] - mean_val) > outlier_threshold
                    outlier_count = outliers.sum()
                    
                    if outlier_count > 0:
                        logger.warning(f"{col}: {outlier_count} potential outliers detected")
                        # Option to cap outliers instead of removing them
                        # df.loc[outliers, col] = np.nan
            else:
                logger.warning(f"Expected column '{col}' not found in data")
        
        return df
    
    def handle_missing_values(self, df, method='interpolate'):
        """Handle missing values in the dataset."""
        logger.info(f"Handling missing values using method: {method}")
        
        numeric_columns = df.select_dtypes(include=[np.number]).columns
        
        if method == 'interpolate':
            # Linear interpolation for time series data
            df[numeric_columns] = df[numeric_columns].interpolate(method='linear')
        elif method == 'forward_fill':
            df[numeric_columns] = df[numeric_columns].fillna(method='ffill')
        elif method == 'backward_fill':
            df[numeric_columns] = df[numeric_columns].fillna(method='bfill')
        elif method == 'mean':
            df[numeric_columns] = df[numeric_columns].fillna(df[numeric_columns].mean())
        elif method == 'median':
            df[numeric_columns] = df[numeric_columns].fillna(df[numeric_columns].median())
        else:
            logger.warning(f"Unknown method '{method}'. Using interpolation.")
            df[numeric_columns] = df[numeric_columns].interpolate(method='linear')
        
        return df
    
    def validate_economic_relationships(self, df):
        """Validate logical relationships between economic variables."""
        logger.info("Validating economic relationships...")
        
        issues = []
        
        # Check if GDP components sum correctly (within reasonable tolerance)
        if all(col in df.columns for col in ['GDP', 'Consumption', 'Investment', 'Government_Spending', 'Net_Exports']):
            gdp_components_sum = (df['Consumption'] + df['Investment'] + 
                                df['Government_Spending'] + df['Net_Exports'])
            gdp_diff = np.abs(df['GDP'] - gdp_components_sum)
            
            # Allow for 5% tolerance
            tolerance = 0.05 * df['GDP'].abs()
            inconsistent_rows = gdp_diff > tolerance
            
            if inconsistent_rows.any():
                count = inconsistent_rows.sum()
                issues.append(f"GDP components don't sum to GDP in {count} rows")
        
        # Check fiscal deficit calculation
        if all(col in df.columns for col in ['Fiscal_Deficit', 'Government_Revenue', 'Expenditure']):
            calculated_deficit = df['Expenditure'] - df['Government_Revenue']
            deficit_diff = np.abs(df['Fiscal_Deficit'] - calculated_deficit)
            
            # Allow for small calculation differences
            tolerance = 0.01 * df['Expenditure'].abs()
            inconsistent_deficit = deficit_diff > tolerance
            
            if inconsistent_deficit.any():
                count = inconsistent_deficit.sum()
                issues.append(f"Fiscal deficit calculation inconsistent in {count} rows")
        
        # Check for negative values where they shouldn't occur
        positive_columns = ['GDP', 'Consumption', 'Investment', 'Government_Spending', 
                          'Government_Revenue', 'Expenditure']
        
        for col in positive_columns:
            if col in df.columns:
                negative_values = (df[col] < 0).sum()
                if negative_values > 0:
                    issues.append(f"{col} has {negative_values} negative values")
        
        if issues:
            logger.warning("Validation issues found:")
            for issue in issues:
                logger.warning(f"  - {issue}")
        else:
            logger.info("All economic relationships validated successfully")
        
        return df, issues
    
    def add_derived_variables(self, df):
        """Add derived economic indicators."""
        logger.info("Adding derived variables...")
        
        # GDP growth rate (year-over-year)
        if 'GDP' in df.columns and len(df) > 12:
            df['GDP_Growth_Rate'] = df['GDP'].pct_change(periods=12) * 100
        
        # Fiscal balance as percentage of GDP
        if all(col in df.columns for col in ['Fiscal_Deficit', 'GDP']):
            df['Fiscal_Balance_GDP_Ratio'] = (df['Fiscal_Deficit'] / df['GDP']) * 100
        
        # Government spending as percentage of GDP
        if all(col in df.columns for col in ['Government_Spending', 'GDP']):
            df['Gov_Spending_GDP_Ratio'] = (df['Government_Spending'] / df['GDP']) * 100
        
        # Real GDP (inflation-adjusted, using base year approach)
        if all(col in df.columns for col in ['GDP', 'Inflation_Rate']):
            # Simple deflation using cumulative inflation from first period
            base_index = 100
            df['Price_Index'] = base_index * (1 + df['Inflation_Rate']/100).cumprod()
            df['Real_GDP'] = df['GDP'] / (df['Price_Index'] / base_index)
        
        return df
    
    def generate_summary_statistics(self, df):
        """Generate and log summary statistics."""
        logger.info("Generating summary statistics...")
        
        numeric_columns = df.select_dtypes(include=[np.number]).columns
        summary = df[numeric_columns].describe()
        
        logger.info(f"Dataset shape: {df.shape}")
        logger.info(f"Date range: {df['Date'].min()} to {df['Date'].max()}")
        logger.info("Summary statistics generated")
        
        return summary
    
    def export_processed_data(self, df, filename):
        """Export cleaned data to processed directory."""
        try:
            filepath = os.path.join(self.processed_data_path, filename)
            df.to_csv(filepath, index=False)
            logger.info(f"Processed data exported to {filepath}")
            return True
        except Exception as e:
            logger.error(f"Error exporting data: {str(e)}")
            return False
    
    def process_dataset(self, input_filename, output_filename=None, 
                       missing_value_method='interpolate'):
        """
        Main processing pipeline for economic datasets.
        
        Parameters:
        - input_filename: Name of the input CSV file in raw data directory
        - output_filename: Name for the output file (optional)
        - missing_value_method: Method for handling missing values
        
        Returns:
        - Processed DataFrame
        """
        
        if output_filename is None:
            output_filename = f"processed_{input_filename}"
        
        logger.info(f"Starting data preprocessing for {input_filename}")
        
        # Load raw data
        df = self.load_raw_data(input_filename)
        if df is None:
            return None
        
        # Data cleaning pipeline
        df = self.clean_date_column(df)
        df = self.clean_numeric_columns(df)
        df = self.handle_missing_values(df, method=missing_value_method)
        
        # Validation and enhancement
        df, validation_issues = self.validate_economic_relationships(df)
        df = self.add_derived_variables(df)
        
        # Generate summary
        summary = self.generate_summary_statistics(df)
        
        # Export processed data
        if self.export_processed_data(df, output_filename):
            logger.info("Data preprocessing completed successfully")
        else:
            logger.error("Failed to export processed data")
        
        return df


def main():
    """Main execution function."""
    # Initialize preprocessor
    preprocessor = EconomicDataPreprocessor()
    
    # Example usage - process multiple datasets
    datasets_to_process = [
        'economic_data.csv',
        'quarterly_gdp.csv',
        'fiscal_indicators.csv'
    ]
    
    processed_datasets = {}
    
    for dataset in datasets_to_process:
        logger.info(f"\n{'='*50}")
        logger.info(f"Processing {dataset}")
        logger.info(f"{'='*50}")
        
        df = preprocessor.process_dataset(dataset)
        if df is not None:
            processed_datasets[dataset] = df
    
    logger.info(f"\nProcessed {len(processed_datasets)} datasets successfully")


if __name__ == "__main__":
    main()