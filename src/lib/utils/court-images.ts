/**
 * Court image utility functions
 */

// Default court images
const DEFAULT_COURT_IMAGES = [
  "https://images.pexels.com/photos/1432038/pexels-photo-1432038.jpeg?auto=compress&cs=tinysrgb&w=600",
  "https://images.pexels.com/photos/209977/pexels-photo-209977.jpeg?auto=compress&cs=tinysrgb&w=600",
  "https://images.pexels.com/photos/221452/pexels-photo-221452.jpeg?auto=compress&cs=tinysrgb&w=600",
  "https://images.pexels.com/photos/2277807/pexels-photo-2277807.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2"
];

/**
 * Get court image URL based on court ID and name
 * @param courtId Court ID
 * @param courtName Court name (optional)
 * @returns Image URL
 */
export const getCourtImage = (courtId: string, courtName?: string): string => {
  // Try to use local images first based on court name
  if (courtName) {
    const normalizedName = courtName.toLowerCase();
    
    // Check for specific court names and return appropriate local images
    if (normalizedName.includes('court a') || normalizedName.includes('court 1')) {
      return '/images/courts/court-1.jpg';
    }
    if (normalizedName.includes('court b') || normalizedName.includes('court 2')) {
      return '/images/courts/court-2.jpg';
    }
  }
  
  // Generate a consistent image based on court ID
  const hash = courtId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const imageIndex = hash % DEFAULT_COURT_IMAGES.length;
  
  return DEFAULT_COURT_IMAGES[imageIndex];
};

/**
 * Get fallback image for courts
 * @returns Default court image URL
 */
export const getFallbackCourtImage = (): string => {
  return DEFAULT_COURT_IMAGES[0];
};