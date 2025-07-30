// Utility function to get court image based on court ID or name
export const getCourtImage = (courtId: string, courtName?: string): string => {
  // Map court IDs to their respective images
  const courtImageMap: Record<string, string> = {
    // You can add more mappings as needed
    'court-1': '/images/courts/court-1.jpg',
    'court-2': '/images/courts/court-2.jpg',
  };

  // Try to get image by court ID first
  if (courtImageMap[courtId]) {
    return courtImageMap[courtId];
  }

  // Try to match by court name (case insensitive)
  if (courtName) {
    const normalizedName = courtName.toLowerCase();
    if (normalizedName.includes('court 1') || normalizedName.includes('terrain 1')) {
      return '/images/courts/court-1.jpg';
    }
    if (normalizedName.includes('court 2') || normalizedName.includes('terrain 2')) {
      return '/images/courts/court-2.jpg';
    }
  }

  // Default fallback image for padel courts
  return 'https://images.pexels.com/photos/2277807/pexels-photo-2277807.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2';
};

// Function to get all available court images
export const getAllCourtImages = (): string[] => {
  return [
    '/images/courts/court-1.jpg',
    '/images/courts/court-2.jpg',
  ];
};

// Function to check if a court image exists locally
export const hasLocalCourtImage = (courtId: string): boolean => {
  const courtImageMap: Record<string, string> = {
    'court-1': '/images/courts/court-1.jpg',
    'court-2': '/images/courts/court-2.jpg',
  };
  
  return courtId in courtImageMap;
};
