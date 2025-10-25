"""
NSE Stock Sector Fetcher
This script reads NSE stock list and fetches sector information from Yahoo Finance
"""

import pandas as pd
import yfinance as yf
import logging
from pathlib import Path
import time

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def get_sector_from_yahoo(symbol_with_ns):
    """
    Fetch sector information for a stock from Yahoo Finance
    Returns sector name or 'Unknown' if not found
    """
    try:
        ticker = yf.Ticker(symbol_with_ns)
        info = ticker.info
        
        # Yahoo Finance returns sector in 'sector' field
        sector = info.get('sector', 'Unknown')
        
        if sector and sector != 'Unknown':
            return sector
        else:
            # Fallback to industry if sector not available
            industry = info.get('industry', 'Unknown')
            return industry if industry else 'Unknown'
            
    except Exception as e:
        logger.warning(f"Error fetching sector for {symbol_with_ns}: {str(e)}")
        return 'Unknown'


def fetch_all_sectors(input_csv_path, output_csv_path):
    """
    Main function to fetch sectors for all stocks
    
    Args:
        input_csv_path: Path to input NSE stock list CSV
        output_csv_path: Path to output CSV with sectors
    """
    
    logger.info(f"Reading stocks from: {input_csv_path}")
    
    # Read the NSE stock list
    try:
        df = pd.read_csv(input_csv_path)
        logger.info(f"Loaded {len(df)} stocks from CSV")
    except Exception as e:
        logger.error(f"Error reading CSV: {str(e)}")
        return False
    
    # Create output dataframe
    output_data = []
    
    # Process each stock
    total_stocks = len(df)
    for idx, row in df.iterrows():
        symbol = row['SYMBOL'].strip()
        company_name = row['NAME OF COMPANY'].strip()
        
        # Add .NS suffix for Yahoo Finance
        symbol_with_ns = f"{symbol}.NS"
        
        # Fetch sector
        sector = get_sector_from_yahoo(symbol_with_ns)
        
        # Add to output
        output_data.append({
            'symbol': symbol_with_ns,
            'name': company_name,
            'exchange': 'NSE',
            'sector': sector
        })
        
        # Progress indicator
        progress = ((idx + 1) / total_stocks) * 100
        if (idx + 1) % 50 == 0:
            logger.info(f"Progress: {idx + 1}/{total_stocks} ({progress:.1f}%) - Last: {symbol} -> {sector}")
        
        # Small delay to avoid rate limiting
        time.sleep(0.1)
    
    # Create output dataframe
    output_df = pd.DataFrame(output_data)
    
    # Save to CSV
    try:
        output_df.to_csv(output_csv_path, index=False)
        logger.info(f"✓ Successfully saved {len(output_df)} stocks with sectors to: {output_csv_path}")
        
        # Show sector distribution
        logger.info("\n=== SECTOR DISTRIBUTION ===")
        sector_counts = output_df['sector'].value_counts()
        for sector, count in sector_counts.items():
            logger.info(f"{sector}: {count} stocks")
        
        return True
    except Exception as e:
        logger.error(f"Error writing output CSV: {str(e)}")
        return False


if __name__ == "__main__":
    # Configure paths
    input_file = "NSE_Stock-List.csv"  # Your input file
    output_file = "nse_stocks_with_sectors.csv"  # Output file
    
    logger.info("=" * 60)
    logger.info("NSE STOCK SECTOR FETCHER")
    logger.info("=" * 60)
    
    # Run the fetch
    success = fetch_all_sectors(input_file, output_file)
    
    if success:
        logger.info("\n✓ Process completed successfully!")
        logger.info(f"Output file: {output_file}")
    else:
        logger.error("\n✗ Process failed!")
