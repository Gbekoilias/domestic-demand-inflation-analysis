# Excel Economic Data Analysis Workbook
**File:** `data/scripts/Excel_Workbook.xlsx`

## Sheet Structure and Formulas

### 1. **Raw_Inflation** Sheet
**Purpose:** Store original imported data without modifications

**Column Structure:**
```
A: Date (Date format: mm/dd/yyyy or dd/mm/yyyy)
B: Inflation_Rate (Number, 2 decimals)
C: GDP (Number, 0 decimals)
D: Consumption (Number, 0 decimals)
E: Investment (Number, 0 decimals)
F: Gov_Spending (Number, 0 decimals)
G: Net_Exports (Number, 0 decimals)
H: Government_Revenue (Number, 0 decimals)
I: Expenditure (Number, 0 decimals)
J: Fiscal_Deficit (Number, 0 decimals)
```

**Data Import Steps:**
1. Data → Get Data → From Text/CSV
2. Select file from `data/raw/` folder
3. Transform: Detect data types automatically
4. Load to Raw_Inflation sheet
5. Format Date column: Right-click → Format Cells → Date → mm/dd/yyyy

---

### 2. **Cleaned_Inflation** Sheet
**Purpose:** Process and clean the raw data using Excel formulas

**Column Structure with Formulas:**

#### Row 1: Headers
```
A1: Date
B1: Inflation_Rate
C1: GDP
D1: Consumption
E1: Investment
F1: Gov_Spending
G1: Net_Exports
H1: Government_Revenue
I1: Expenditure
J1: Fiscal_Deficit
K1: Year
L1: Quarter
M1: GDP_Growth_Rate
N1: Fiscal_Balance_GDP_Ratio
O1: Gov_Spending_GDP_Ratio
P1: Price_Index
Q1: Real_GDP
R1: Data_Quality_Flag
```

#### Row 2 and Below: Data Processing Formulas

**A2 (Date Cleaning):**
```excel
=IF(ISBLANK(Raw_Inflation!A2),"",
   IF(ISNUMBER(Raw_Inflation!A2),Raw_Inflation!A2,
      DATEVALUE(Raw_Inflation!A2)))
```

**B2 (Inflation Rate with Missing Value Handling):**
```excel
=IF(ISBLANK(Raw_Inflation!B2),
   IF(ROW()=2,0,
      IF(ISBLANK(Raw_Inflation!B3),B1,
         (Raw_Inflation!B1+Raw_Inflation!B3)/2)),
   Raw_Inflation!B2)
```

**C2 (GDP with Outlier Detection):**
```excel
=IF(ISBLANK(Raw_Inflation!C2),
   IF(ROW()=2,0,C1),
   IF(ABS(Raw_Inflation!C2-AVERAGE(Raw_Inflation!C:C))>3*STDEV(Raw_Inflation!C:C),
      AVERAGE(Raw_Inflation!C:C),
      Raw_Inflation!C2))
```

**D2-J2 (Similar pattern for other economic variables):**
```excel
=IF(ISBLANK(Raw_Inflation!D2),
   IF(ROW()=2,0,D1),
   Raw_Inflation!D2)
```

**K2 (Year Extraction):**
```excel
=YEAR(A2)
```

**L2 (Quarter Calculation):**
```excel
=ROUNDUP(MONTH(A2)/3,0)
```

**M2 (GDP Growth Rate - YoY):**
```excel
=IF(ROW()<=13,"",
   IF(C14=0,"",
      ((C2/INDEX(C:C,ROW()-12))-1)*100))
```

**N2 (Fiscal Balance as % of GDP):**
```excel
=IF(OR(C2=0,ISBLANK(C2),ISBLANK(J2)),"",
   (J2/C2)*100)
```

**O2 (Government Spending as % of GDP):**
```excel
=IF(OR(C2=0,ISBLANK(C2),ISBLANK(F2)),"",
   (F2/C2)*100)
```

**P2 (Price Index Calculation):**
```excel
=IF(ROW()=2,100,
   IF(ISBLANK(B2),P1,
      P1*(1+B2/100)))
```

**Q2 (Real GDP):**
```excel
=IF(OR(C2=0,P2=0),"",
   C2/(P2/100))
```

**R2 (Data Quality Flag):**
```excel
=IF(OR(ISBLANK(A2),ISBLANK(B2),ISBLANK(C2)),"MISSING_DATA",
   IF(ABS(C2-(D2+E2+F2+G2))>0.05*C2,"GDP_MISMATCH",
      IF(ABS(J2-(I2-H2))>0.01*I2,"FISCAL_MISMATCH",
         "GOOD")))
```

#### Data Validation Rules:
**For Date Column (A:A):**
- Data Validation → Date → Between 1/1/2000 and 12/31/2030

**For Numeric Columns (B:Q):**
- Data Validation → Decimal → Greater than or equal to -999999

#### Conditional Formatting:
**GDP Mismatch Highlighting:**
- Select column R → Conditional Formatting → Highlight Cells Rules → Text that Contains "GDP_MISMATCH" → Red Fill

**Missing Data Highlighting:**
- Select column R → Conditional Formatting → Text that Contains "MISSING_DATA" → Yellow Fill

---

### 3. **Analysis** Sheet
**Purpose:** Pivot tables, charts, and summary statistics

#### Summary Statistics Table (Starting at A1):
```
A1: Statistic | B1: GDP | C1: Inflation_Rate | D1: Consumption | E1: Investment

A2: Mean
B2: =AVERAGE(Cleaned_Inflation!C:C)
C2: =AVERAGE(Cleaned_Inflation!B:B)
D2: =AVERAGE(Cleaned_Inflation!D:D)
E2: =AVERAGE(Cleaned_Inflation!E:E)

A3: Median
B3: =MEDIAN(Cleaned_Inflation!C:C)
C3: =MEDIAN(Cleaned_Inflation!B:B)
D3: =MEDIAN(Cleaned_Inflation!D:D)
E3: =MEDIAN(Cleaned_Inflation!E:E)

A4: Std Dev
B4: =STDEV(Cleaned_Inflation!C:C)
C4: =STDEV(Cleaned_Inflation!B:B)
D4: =STDEV(Cleaned_Inflation!D:D)
E4: =STDEV(Cleaned_Inflation!E:E)

A5: Min
B5: =MIN(Cleaned_Inflation!C:C)
C5: =MIN(Cleaned_Inflation!B:B)
D5: =MIN(Cleaned_Inflation!D:D)
E5: =MIN(Cleaned_Inflation!E:E)

A6: Max
B6: =MAX(Cleaned_Inflation!C:C)
C6: =MAX(Cleaned_Inflation!B:B)
D6: =MAX(Cleaned_Inflation!D:D)
E6: =MAX(Cleaned_Inflation!E:E)

A7: Count
B7: =COUNT(Cleaned_Inflation!C:C)
C7: =COUNT(Cleaned_Inflation!B:B)
D7: =COUNT(Cleaned_Inflation!D:D)
E7: =COUNT(Cleaned_Inflation!E:E)
```

#### Correlation Matrix (Starting at G1):
```
G1: [Blank] | H1: GDP | I1: Inflation | J1: Consumption | K1: Investment

H2: GDP
H3: =CORREL(Cleaned_Inflation!C:C,Cleaned_Inflation!C:C)
I3: =CORREL(Cleaned_Inflation!C:C,Cleaned_Inflation!B:B)
J3: =CORREL(Cleaned_Inflation!C:C,Cleaned_Inflation!D:D)
K3: =CORREL(Cleaned_Inflation!C:C,Cleaned_Inflation!E:E)

I2: Inflation
H4: =CORREL(Cleaned_Inflation!B:B,Cleaned_Inflation!C:C)
I4: =CORREL(Cleaned_Inflation!B:B,Cleaned_Inflation!B:B)
J4: =CORREL(Cleaned_Inflation!B:B,Cleaned_Inflation!D:D)
K4: =CORREL(Cleaned_Inflation!B:B,Cleaned_Inflation!E:E)
```

#### Pivot Table Setup:
**Location:** Starting at A15

**Steps to Create:**
1. Select data range from Cleaned_Inflation sheet (A:R)
2. Insert → PivotTable → New Worksheet
3. Move to Analysis sheet at A15

**Pivot Table Structure:**
- **Rows:** Year, Quarter
- **Values:** 
  - Average of GDP
  - Average of Inflation_Rate
  - Average of GDP_Growth_Rate
- **Filters:** Data_Quality_Flag (exclude "MISSING_DATA")

#### Charts:

**Chart 1: GDP and Inflation Trend (Line Chart)**
- Location: Starting at M1
- Data: Cleaned_Inflation!A:C (Date, Inflation_Rate, GDP)
- Chart Type: Combo Chart (Line with secondary axis)
- X-axis: Date
- Primary Y-axis: GDP
- Secondary Y-axis: Inflation Rate

**Chart 2: GDP Components (Stacked Column Chart)**
- Location: Starting at M20
- Data: Cleaned_Inflation A, D:G (Date, Consumption, Investment, Gov_Spending, Net_Exports)
- Chart Type: Stacked Column Chart
- X-axis: Date (grouped by year)

**Chart 3: Fiscal Analysis (Line Chart)**
- Location: Starting at M40
- Data: Cleaned_Inflation A, N:O (Date, Fiscal_Balance_GDP_Ratio, Gov_Spending_GDP_Ratio)
- Chart Type: Line Chart with markers

---

### 4. **Documentation** Sheet
**Purpose:** Variable definitions, data sources, and methodology

#### Variable Definitions (Starting at A1):
```
A1: Variable Name | B1: Description | C1: Unit | D1: Source | E1: Notes

A2: Date | B2: Time period of observation | C2: Date | D2: Central Bank/Statistical Office | E2: Monthly frequency preferred

A3: Inflation_Rate | B3: Consumer Price Index year-over-year change | C3: Percentage | D3: National Statistical Office | E3: CPI-based inflation

A4: GDP | B4: Gross Domestic Product | C4: Millions (Local Currency) | D4: National Accounts | E4: Nominal values

A5: Consumption | B5: Private Consumption Expenditure | C5: Millions (Local Currency) | D5: National Accounts | E5: Household final consumption

A6: Investment | B6: Gross Fixed Capital Formation | C6: Millions (Local Currency) | D6: National Accounts | E6: Private + Public investment

A7: Gov_Spending | B7: Government Final Consumption | C7: Millions (Local Currency) | D7: National Accounts | E7: Current expenditure only

A8: Net_Exports | B8: Exports minus Imports | C8: Millions (Local Currency) | D8: Balance of Payments | E8: Goods and services

A9: Government_Revenue | B9: Total Government Revenue | C9: Millions (Local Currency) | D9: Ministry of Finance | E9: Tax + Non-tax revenue

A10: Expenditure | B10: Total Government Expenditure | C10: Millions (Local Currency) | D10: Ministry of Finance | E10: Current + Capital expenditure

A11: Fiscal_Deficit | B11: Government Expenditure minus Revenue | C11: Millions (Local Currency) | D11: Ministry of Finance | E11: Negative = surplus
```

#### Data Processing Methodology (Starting at A15):
```
A15: Data Processing Steps
A16: 1. Import raw data from CSV files in data/raw/ folder
A17: 2. Clean date formats using DATEVALUE function
A18: 3. Handle missing values through interpolation (average of adjacent values)
A19: 4. Detect outliers using 3-sigma rule (replace with mean if detected)
A20: 5. Validate economic relationships (GDP = C+I+G+NX, Deficit = Exp-Rev)
A21: 6. Calculate derived variables (growth rates, ratios, real values)
A22: 7. Flag data quality issues for manual review
A23: 8. Generate summary statistics and visualizations

A25: Quality Control Checks
A26: • GDP Components Check: |GDP - (C+I+G+NX)| < 5% of GDP
A27: • Fiscal Balance Check: |Deficit - (Exp-Rev)| < 1% of Expenditure  
A28: • Missing Data Flag: Any blank cells in key variables
A29: • Outlier Detection: Values beyond 3 standard deviations
A30: • Date Continuity: Check for gaps in time series
```

#### Formula Documentation (Starting at A35):
```
A35: Key Formulas Used
A36: GDP Growth Rate: ((GDP_t / GDP_t-12) - 1) * 100
A37: Price Index: Cumulative product of (1 + Inflation_Rate/100)
A38: Real GDP: Nominal GDP / (Price Index / 100)
A39: Fiscal Ratios: (Fiscal Variable / GDP) * 100
A40: Missing Value Interpolation: (Previous_Value + Next_Value) / 2
```

#### Data Sources and Contact Information (Starting at A45):
```
A45: Data Sources | B45: Contact | C45: Update Frequency | D45: Last Updated

A46: National Statistical Office | B46: statistics@gov.country | C46: Monthly | D46: [Insert Date]
A47: Central Bank | B47: data@centralbank.country | C47: Monthly | D47: [Insert Date]  
A48: Ministry of Finance | B48: fiscal@mof.country | C48: Monthly | D48: [Insert Date]
```

---

## Implementation Instructions

### Step-by-Step Setup:

1. **Create New Workbook:**
   - File → New → Blank Workbook
   - Save as `Excel_Workbook.xlsx` in `data/scripts/` folder

2. **Create Sheets:**
   - Right-click sheet tab → Insert → Worksheet
   - Rename sheets: Raw_Inflation, Cleaned_Inflation, Analysis, Documentation

3. **Set Up Raw_Inflation:**
   - Import CSV data using Data → Get Data → From Text/CSV
   - Format columns according to specifications above

4. **Build Cleaned_Inflation:**
   - Copy all formulas from specifications above
   - Apply conditional formatting rules
   - Set up data validation

5. **Create Analysis Sheet:**
   - Build summary statistics table
   - Create pivot tables following specifications
   - Insert charts using specified data ranges

6. **Complete Documentation:**
   - Fill in all variable definitions
   - Document data sources and contacts
   - Update methodology notes

### Maintenance Workflow:

1. **Monthly Data Update:**
   - Import new data to Raw_Inflation sheet
   - Refresh all formulas in Cleaned_Inflation
   - Update pivot tables (Data → Refresh All)
   - Check Data_Quality_Flag column for issues

2. **Quality Control:**
   - Review conditional formatting highlights
   - Check correlation matrix for unusual changes
   - Validate GDP components and fiscal relationships
   - Update documentation with any methodology changes

This Excel workbook provides a comprehensive economic data analysis platform with automated data cleaning, quality control, and visualization capabilities.