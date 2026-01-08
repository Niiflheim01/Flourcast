// Demo product images - maps filename to require() for bundled assets
// Used for demo mode to display pre-bundled product images

const DEMO_PRODUCT_IMAGES: Record<string, any> = {
  'pandesal.jpg': require('@/assets/images/pandesal.jpg'),
  'spanish-bread.jpg': require('@/assets/images/spanish-bread.jpg'),
  'cheese-roll.jpg': require('@/assets/images/cheese-roll.jpg'),
  'ensaymada.jpg': require('@/assets/images/ensaymada.jpg'),
  'chicken-empanada.jpg': require('@/assets/images/chicken-empanada.jpg'),
  'chocolate-cake-slice.jpg': require('@/assets/images/chocolate-cake-slice.jpg'),
  'red-velvet-crinkles.jpg': require('@/assets/images/red-velvet-crinkles.jpg'),
  'ham-cheese-croissant.jpg': require('@/assets/images/ham-cheese-croissant.jpg'),
  'ube-cheesecake-slice.jpg': require('@/assets/images/ube-cheesecake-slice.jpg'),
  'mango-graham-cake.jpg': require('@/assets/images/mango-graham-cake.jpg'),
  'chocolate-chip-cookies.jpg': require('@/assets/images/chocolate-chip-cookies.jpg'),
  'ube-crinkles.jpg': require('@/assets/images/ube-crinkles.jpg'),
};

// Map product names directly to images (fallback for demo mode)
const DEMO_PRODUCT_NAME_TO_IMAGE: Record<string, any> = {
  'Pandesal': require('@/assets/images/pandesal.jpg'),
  'Spanish Bread': require('@/assets/images/spanish-bread.jpg'),
  'Cheese Roll': require('@/assets/images/cheese-roll.jpg'),
  'Ensaymada': require('@/assets/images/ensaymada.jpg'),
  'Chicken Empanada': require('@/assets/images/chicken-empanada.jpg'),
  'Chocolate Cake Slice': require('@/assets/images/chocolate-cake-slice.jpg'),
  'Red Velvet Crinkles': require('@/assets/images/red-velvet-crinkles.jpg'),
  'Ham & Cheese Croissant': require('@/assets/images/ham-cheese-croissant.jpg'),
  'Ube Cheesecake Slice': require('@/assets/images/ube-cheesecake-slice.jpg'),
  'Mango Graham Cake': require('@/assets/images/mango-graham-cake.jpg'),
  'Chocolate Chip Cookies': require('@/assets/images/chocolate-chip-cookies.jpg'),
  'Ube Crinkles': require('@/assets/images/ube-crinkles.jpg'),
  // Ingredients
  'All-Purpose Flour': require('@/assets/images/all-purpose-flour.jpg'),
  'Bread Flour': require('@/assets/images/bread-flour.jpg'),
  'Sugar': require('@/assets/images/sugar.jpg'),
  'Butter': require('@/assets/images/butter.jpg'),
  'Eggs': require('@/assets/images/eggs.jpg'),
  'Milk': require('@/assets/images/milk.jpg'),
  'Cream Cheese': require('@/assets/images/cream-cheese.jpg'),
  'Ube Halaya': require('@/assets/images/ube-halaya.jpg'),
  'Chocolate Chips': require('@/assets/images/chocolate-chips.jpg'),
  'Yeast': require('@/assets/images/yeast.jpg'),
};

// Demo profile image
export const DEMO_PROFILE_IMAGE = require('@/assets/images/profile-panmasa.jpg');

/**
 * Get the image source for a product by name (for demo mode)
 * @param productName - The product name
 * @returns The bundled image source or null
 */
export function getDemoProductImageByName(productName: string | null | undefined): any {
  if (!productName) return null;
  return DEMO_PRODUCT_NAME_TO_IMAGE[productName] || null;
}

/**
 * Get the image source for a product
 * @param imageUrl - The image_url from the database (filename for demo, URI for user-uploaded)
 * @param productName - Optional product name for fallback lookup
 * @returns The image source (require() for demo images, {uri: string} for user uploads)
 */
export function getProductImageSource(imageUrl: string | null | undefined, productName?: string | null): any {
  // First try by filename
  if (imageUrl && DEMO_PRODUCT_IMAGES[imageUrl]) {
    return DEMO_PRODUCT_IMAGES[imageUrl];
  }
  
  // Fallback: try by product name (for demo mode)
  if (productName && DEMO_PRODUCT_NAME_TO_IMAGE[productName]) {
    return DEMO_PRODUCT_NAME_TO_IMAGE[productName];
  }
  
  // If it's a URI (user-uploaded image)
  if (imageUrl && (imageUrl.startsWith('file://') || imageUrl.startsWith('http'))) {
    return { uri: imageUrl };
  }
  
  return null;
}

/**
 * Check if an image URL is a demo image
 */
export function isDemoImage(imageUrl: string | null | undefined): boolean {
  if (!imageUrl) return false;
  return !!DEMO_PRODUCT_IMAGES[imageUrl];
}

export { DEMO_PRODUCT_IMAGES, DEMO_PRODUCT_NAME_TO_IMAGE };
