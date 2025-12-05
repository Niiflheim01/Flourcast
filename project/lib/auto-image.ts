import { ProductImageStorage } from './image-storage';

// Known Filipino bakery products and their search terms
const KNOWN_PRODUCTS: Record<string, string> = {
  // Breads
  'pandesal': 'pandesal filipino bread',
  'ensaymada': 'ensaymada filipino pastry',
  'pan de coco': 'pan de coco coconut bread',
  'monay': 'monay bread filipino',
  'putok': 'putok bread filipino',
  'spanish bread': 'spanish bread filipino',
  'kababayan': 'kababayan muffin filipino',

  // Pastries
  'ube cheese pandesal': 'ube cheese pandesal',
  'cheese bread': 'cheese bread roll',
  'dinner roll': 'dinner roll bread',
  'loaf bread': 'white loaf bread',

  // Cakes & Pastries
  'ube cake': 'ube cake filipino',
  'mamon': 'mamon sponge cake filipino',
  'pianono': 'pianono roll cake filipino',
  'brazo de mercedes': 'brazo de mercedes filipino dessert',
  'sans rival': 'sans rival cake filipino',

  // Cookies & Small Items
  'egg pie': 'egg pie filipino',
  'buko pie': 'buko pie coconut filipino',
  'empanada': 'empanada pastry',
  'hopia': 'hopia filipino pastry',
  'polvoron': 'polvoron filipino',
  'otap': 'otap biscuit filipino',
  'barquillos': 'barquillos wafer filipino',

  // Common Baking Ingredients - Flours
  'flour': 'all purpose flour baking',
  'all purpose flour': 'all purpose flour',
  'bread flour': 'bread flour',
  'cake flour': 'cake flour',
  'whole wheat flour': 'whole wheat flour',
  'cornstarch': 'cornstarch',
  'baking powder': 'baking powder',
  'baking soda': 'baking soda',

  // Sugars & Sweeteners
  'sugar': 'white sugar granulated',
  'white sugar': 'white sugar',
  'brown sugar': 'brown sugar',
  'powdered sugar': 'powdered sugar icing',
  'confectioners sugar': 'confectioners sugar',
  'condensed milk': 'condensed milk',
  'evaporated milk': 'evaporated milk',
  'honey': 'honey jar',
  'molasses': 'molasses',

  // Dairy
  'butter': 'butter stick',
  'margarine': 'margarine',
  'cream cheese': 'cream cheese',
  'milk': 'milk bottle',
  'fresh milk': 'fresh milk',
  'cream': 'heavy cream',
  'heavy cream': 'heavy cream',
  'sour cream': 'sour cream',

  // Eggs & Proteins
  'eggs': 'eggs carton',
  'egg white': 'egg white',
  'egg yolk': 'egg yolk',

  // Fats & Oils
  'oil': 'cooking oil bottle',
  'vegetable oil': 'vegetable oil',
  'coconut oil': 'coconut oil',
  'olive oil': 'olive oil',
  'shortening': 'shortening',

  // Leavening Agents
  'yeast': 'active dry yeast',
  'active dry yeast': 'active dry yeast',
  'instant yeast': 'instant yeast',

  // Seasonings & Spices
  'salt': 'salt',
  'vanilla': 'vanilla extract bottle',
  'vanilla extract': 'vanilla extract',
  'cinnamon': 'cinnamon powder',
  'nutmeg': 'nutmeg',

  // Filipino Ingredients
  'ube': 'ube purple yam',
  'ube halaya': 'ube halaya jam',
  'macapuno': 'macapuno coconut',
  'coconut': 'shredded coconut',
  'desiccated coconut': 'desiccated coconut',
  'buko': 'young coconut buko',
  'pandan': 'pandan leaves',
  'langka': 'jackfruit langka',
  'mango': 'mango philippine',
  'cheese': 'cheddar cheese block',
  'cheddar cheese': 'cheddar cheese',
  'eden cheese': 'eden cheese filipino',
  'queso de bola': 'queso de bola cheese',

  // Nuts & Add-ins
  'cashew': 'cashew nuts',
  'peanuts': 'peanuts',
  'almonds': 'almonds',
  'walnuts': 'walnuts',
  'raisins': 'raisins',
  'chocolate chips': 'chocolate chips',
  'white chocolate chips': 'white chocolate chips',
  'dark chocolate chips': 'dark chocolate chips',
  'milk chocolate chips': 'milk chocolate chips',
  'chocolate': 'chocolate bar',
  'white chocolate': 'white chocolate bar',
  'dark chocolate': 'dark chocolate bar',
  'cocoa powder': 'cocoa powder',
  'sesame seeds': 'sesame seeds',

  // Others
  'water': 'water glass',
  'bread crumbs': 'bread crumbs',
  'gelatin': 'gelatin powder',
  'food coloring': 'food coloring',
};

/**
 * Check if the product name matches a known bakery product
 */
export function isKnownProduct(productName: string): boolean {
  const normalized = productName.toLowerCase().trim();

  // Direct match
  if (KNOWN_PRODUCTS[normalized]) {
    return true;
  }

  // Check if any known product is contained in the name
  for (const knownProduct of Object.keys(KNOWN_PRODUCTS)) {
    if (normalized.includes(knownProduct)) {
      return true;
    }
  }

  return false;
}

/**
 * Get search term for a product
 */
function getSearchTerm(productName: string): string {
  const normalized = productName.toLowerCase().trim();

  // Direct match
  if (KNOWN_PRODUCTS[normalized]) {
    return KNOWN_PRODUCTS[normalized];
  }

  // Check if any known product is contained in the name
  for (const [knownProduct, searchTerm] of Object.entries(KNOWN_PRODUCTS)) {
    if (normalized.includes(knownProduct)) {
      return searchTerm;
    }
  }

  // Fallback to the product name itself
  return productName;
}

/**
 * Check if device is connected to WiFi/internet
 */
async function isConnected(): Promise<boolean> {
  try {
    // Simple connectivity check by trying to fetch from a reliable endpoint
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout

    const response = await fetch('https://www.google.com/favicon.ico', {
      method: 'HEAD',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return response.ok;
  } catch (error) {
    return false;
  }
}

/**
 * Fetch multiple images for gallery selection
 */
export async function searchProductImages(searchTerm: string): Promise<Array<{url: string, photographer: string}>> {
  try {
    const pexelsResponse = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(searchTerm)}&per_page=15&orientation=square`,
      {
        headers: {
          'Authorization': 'PBHGIb2BIvGOPJ8xVQlU9Ufl6VCRrRxhpCGolMzCHLb7GEMsMjJUQRyj',
        },
      }
    );

    if (pexelsResponse.ok) {
      const data = await pexelsResponse.json();
      if (data.photos && data.photos.length > 0) {
        return data.photos.map((photo: any) => ({
          url: photo.src.medium,
          photographer: photo.photographer,
        }));
      }
    }
    return [];
  } catch (error) {
    console.error('Error searching images:', error);
    return [];
  }
}

/**
 * Download and save image from URL
 */
export async function downloadImage(imageUrl: string): Promise<string | null> {
  try {
    const localUri = await ProductImageStorage.downloadAndSaveImage(imageUrl);
    return localUri;
  } catch (error) {
    console.error('Error downloading image:', error);
    return null;
  }
}

/**
 * Automatically fetch and set image for known products
 * Returns the image URI if successful, null otherwise
 */
export async function autoFetchProductImage(
  productName: string,
  userProvidedImage: string | null
): Promise<string | null> {
  // Return user-provided image if available
  if (userProvidedImage) {
    return userProvidedImage;
  }

  // Check internet connectivity
  const connected = await isConnected();
  if (!connected) {
    console.log('No internet connection, cannot search for images');
    return null;
  }

  // Get search term
  const searchTerm = getSearchTerm(productName);
  
  console.log(`Searching for image: ${productName} (term: ${searchTerm})`);
  const imageUri = await fetchProductImage(searchTerm);

  if (imageUri) {
    console.log(`Successfully found image for ${productName}`);
  } else {
    console.log(`No suitable image found for ${productName}`);
  }

  return imageUri;
}

/**
 * Get list of all known product names (for display/reference)
 */
export function getKnownProductNames(): string[] {
  return Object.keys(KNOWN_PRODUCTS);
}
