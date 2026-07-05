/**
 * Maps common ingredients to supermarket aisles. The categorization is
 * done by keyword matching against the ingredient name.
 */

const AISLE_KEYWORDS: Record<string, string[]> = {
  'Produce': [
    'onion', 'garlic', 'ginger', 'tomato', 'potato', 'carrot', 'pepper',
    'chilli', 'chili', 'lettuce', 'spinach', 'broccoli', 'courgette',
    'zucchini', 'avocado', 'cucumber', 'mushroom', 'celery', 'leek',
    'aubergine', 'eggplant', 'cabbage', 'kale', 'spring onion', 'shallot',
    'lemon', 'lime', 'orange', 'apple', 'banana', 'berries', 'mango',
    'pear', 'herbs', 'basil', 'coriander', 'cilantro', 'parsley', 'mint',
    'rosemary', 'thyme', 'dill', 'rocket', 'bean sprouts', 'pak choi',
    'bok choy', 'sweetcorn', 'corn', 'peas', 'green beans', 'asparagus',
    'beetroot', 'radish', 'turnip', 'squash', 'pumpkin', 'fennel',
  ],
  'Meat & Fish': [
    'chicken', 'beef', 'pork', 'lamb', 'turkey', 'mince', 'steak',
    'bacon', 'sausage', 'ham', 'prosciutto', 'salami', 'duck',
    'salmon', 'tuna', 'cod', 'prawns', 'shrimp', 'fish', 'anchovy',
    'anchovies', 'mackerel', 'sea bass', 'haddock', 'crab', 'lobster',
    'squid', 'mussels', 'chorizo', 'pancetta',
  ],
  'Dairy & Eggs': [
    'milk', 'cream', 'butter', 'cheese', 'yoghurt', 'yogurt', 'egg',
    'eggs', 'creme fraiche', 'sour cream', 'mozzarella', 'parmesan',
    'cheddar', 'feta', 'ricotta', 'mascarpone', 'brie', 'goat cheese',
    'double cream', 'single cream', 'clotted cream', 'custard',
  ],
  'Canned Goods & Soups': [
    'tinned', 'canned', 'chopped tomatoes', 'coconut milk', 'beans',
    'chickpeas', 'lentils', 'tomato puree', 'tomato paste', 'passata',
    'stock', 'broth', 'soup', 'baked beans', 'sweetcorn', 'tuna',
    'sardines', 'olives', 'capers', 'artichoke',
  ],
  'Condiments, Sauces & Spices': [
    'oil', 'olive oil', 'vegetable oil', 'sesame oil', 'vinegar',
    'soy sauce', 'fish sauce', 'worcestershire', 'mustard', 'ketchup',
    'mayonnaise', 'hot sauce', 'sriracha', 'tabasco', 'curry paste',
    'pesto', 'honey', 'maple syrup', 'salt', 'pepper', 'cumin',
    'paprika', 'turmeric', 'cinnamon', 'nutmeg', 'oregano', 'chili flakes',
    'chilli flakes', 'cayenne', 'garlic powder', 'onion powder',
    'mixed herbs', 'bay leaf', 'cardamom', 'cloves', 'coriander seeds',
    'fennel seeds', 'garam masala', 'curry powder', 'chinese five spice',
    'vanilla', 'vanilla extract', 'balsamic', 'mirin', 'sake',
    'tahini', 'harissa', 'miso', 'oyster sauce', 'hoisin',
    'peanut butter', 'almond butter',
  ],
  'Bakery & Bread': [
    'bread', 'rolls', 'baguette', 'pitta', 'naan', 'tortilla', 'wrap',
    'crumpet', 'muffin', 'croissant', 'sourdough', 'ciabatta', 'bagel',
  ],
  'Grains, Pasta & Rice': [
    'pasta', 'spaghetti', 'penne', 'fusilli', 'linguine', 'tagliatelle',
    'noodles', 'rice', 'basmati', 'risotto', 'couscous', 'quinoa',
    'bulgur', 'orzo', 'flour', 'oats', 'porridge', 'cereal',
    'breadcrumbs', 'panko', 'polenta', 'cornflour', 'cornstarch',
  ],
  'Frozen': [
    'frozen', 'ice cream', 'frozen peas', 'frozen berries',
    'frozen spinach', 'frozen prawns', 'frozen chips',
  ],
  'Baking': [
    'sugar', 'icing sugar', 'caster sugar', 'brown sugar', 'demerara',
    'baking powder', 'baking soda', 'bicarbonate', 'yeast',
    'cocoa', 'chocolate', 'chocolate chips', 'golden syrup', 'treacle',
    'cornflour', 'self-raising flour', 'plain flour', 'strong flour',
    'food colouring', 'sprinkles', 'marzipan', 'fondant',
  ],
  'Drinks': [
    'wine', 'beer', 'cider', 'juice', 'water', 'sparkling',
    'tonic', 'lemonade', 'cola', 'coffee', 'tea',
  ],
};

/**
 * Returns the supermarket aisle for a given ingredient name.
 * Falls back to "Other" if no keyword matches.
 */
export function getAisle(ingredientName: string): string {
  const lower = ingredientName.trim().toLowerCase();

  for (const [aisle, keywords] of Object.entries(AISLE_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lower.includes(keyword)) {
        return aisle;
      }
    }
  }

  return 'Other';
}

export const AISLE_ORDER = [
  'Produce',
  'Meat & Fish',
  'Dairy & Eggs',
  'Bakery & Bread',
  'Canned Goods & Soups',
  'Grains, Pasta & Rice',
  'Condiments, Sauces & Spices',
  'Baking',
  'Frozen',
  'Drinks',
  'Other',
];
