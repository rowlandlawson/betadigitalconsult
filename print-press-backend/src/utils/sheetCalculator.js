// /print-press-backend/src/utils/sheetCalculator.js

/**
 * Utility class for sheet-based inventory calculations
 */
export class SheetCalculator {
  
  /**
   * Convert mixed units (reams + sheets) to total sheets
   * @param {number} reams - Number of full reams
   * @param {number} sheets - Number of loose sheets
   * @param {number} sheetsPerReam - Sheets per ream (default 500)
   * @returns {number} Total sheets
   */
  static toSheets(reams = 0, sheets = 0, sheetsPerReam = 500) {
    return (reams * sheetsPerReam) + sheets;
  }
  
  /**
   * Convert total sheets to display format (reams & sheets)
   * @param {number} totalSheets - Total number of sheets
   * @param {number} sheetsPerReam - Sheets per ream (default 500)
   * @returns {Object} Display-ready format
   */
  static toDisplay(totalSheets, sheetsPerReam = 500) {
    const safeSheetsPerReam = sheetsPerReam > 0 ? sheetsPerReam : 500;
    const reams = Math.floor(totalSheets / safeSheetsPerReam);
    const sheets = totalSheets % safeSheetsPerReam;
    
    return {
      totalSheets,
      reams,
      sheets,
      display: reams > 0 
        ? sheets > 0 
          ? `${reams} ream${reams !== 1 ? 's' : ''}, ${sheets} sheet${sheets !== 1 ? 's' : ''}`
          : `${reams} ream${reams !== 1 ? 's' : ''}`
        : `${sheets} sheet${sheets !== 1 ? 's' : ''}`,
      displayShort: reams > 0 
        ? sheets > 0 
          ? `${reams}r ${sheets}s`
          : `${reams}r`
        : `${sheets}s`
    };
  }
  
  /**
   * Calculate stock after usage
   * @param {number} currentSheets - Current stock in sheets
   * @param {number} sheetsUsed - Sheets to use (including waste)
   * @returns {Object} Result
   */
  static useStock(currentSheets, sheetsUsed) {
    if (sheetsUsed > currentSheets) {
      throw new Error(`Insufficient stock. Need ${sheetsUsed} sheets, have ${currentSheets} sheets`);
    }
    
    const newSheets = currentSheets - sheetsUsed;
    const display = this.toDisplay(newSheets);
    
    return {
      success: true,
      sheetsUsed,
      newSheets,
      ...display
    };
  }
  
  /**
   * Add stock to inventory
   * @param {number} currentSheets - Current stock in sheets
   * @param {number} reamsToAdd - Full reams to add
   * @param {number} sheetsToAdd - Loose sheets to add
   * @param {number} sheetsPerReam - Sheets per ream
   * @returns {Object} Result
   */
  static addStock(currentSheets, reamsToAdd = 0, sheetsToAdd = 0, sheetsPerReam = 500) {
    const sheetsFromReams = reamsToAdd * sheetsPerReam;
    const totalAdded = sheetsFromReams + sheetsToAdd;
    const newSheets = currentSheets + totalAdded;
    const display = this.toDisplay(newSheets);
    
    return {
      success: true,
      reamsAdded: reamsToAdd,
      sheetsAdded: sheetsToAdd,
      totalAddedSheets: totalAdded,
      newSheets,
      ...display
    };
  }
  
  /**
   * Check if stock is low
   * @param {number} currentSheets - Current sheets
   * @param {number} thresholdSheets - Threshold in sheets
   * @returns {Object} Status
   */
  static checkStockStatus(currentSheets, thresholdSheets) {
    const percentage = (currentSheets / thresholdSheets) * 100;
    
    let status = 'HEALTHY';
    let priority = 'low';
    
    if (currentSheets <= thresholdSheets) {
      status = 'CRITICAL';
      priority = 'high';
    } else if (currentSheets <= thresholdSheets * 1.5) {
      status = 'LOW';
      priority = 'medium';
    }
    
    const display = this.toDisplay(currentSheets);
    const thresholdDisplay = this.toDisplay(thresholdSheets);
    
    return {
      status,
      priority,
      percentage: Math.round(percentage),
      currentSheets,
      thresholdSheets,
      isLow: currentSheets <= thresholdSheets,
      needsReorder: currentSheets <= thresholdSheets,
      display: `${display.display} (${percentage.toFixed(0)}% of threshold)`,
      currentDisplay: display,
      thresholdDisplay: thresholdDisplay
    };
  }
  
  /**
   * Calculate cost for sheets used
   * @param {number} sheetsUsed - Sheets used
   * @param {number} costPerReam - Cost per ream
   * @param {number} sheetsPerReam - Sheets per ream
   * @returns {number} Cost
   */
  static calculateCost(sheetsUsed, costPerReam, sheetsPerReam = 500) {
    const costPerSheet = costPerReam / sheetsPerReam;
    return sheetsUsed * costPerSheet;
  }
}
