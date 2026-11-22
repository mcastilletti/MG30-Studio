import {
  Apple, Avocado, Baby, Bacon, Banana, Bath, Battery, Bean, Beef, Beer, BottleWine, Brush, BrushCleaning, Bubbles, Can, CanSoda,
  Carrot, Carton, Cat, Candy, Cheese, Cherry, ChocolateBar, Citrus, Coffee, Cookie, Croissant, Cuboid, Cupcake, CupSoda, CakeSlice, Dessert,
  Dog, Donut, Droplet, Droplets, Drumstick, Egg, Fish, Grape, Ham, Hamburger, IceCream, IceCreamBowl, LeafyGreen, Lightbulb, Martini,
  Milk, Mop, Nut, PawPrint, Pizza, Popcorn, Salad, Sandwich, Scroll, Shell, ShoppingBasket, Shrimp, ShowerHead, SoapDispenserDroplet,
  Soup, Sparkles, SprayCan, Sprout, Snowflake, Sun, Toilet, Toothbrush, Trash2, TubeLotion, WashingMachine, Wheat, Wine, GlassWater,
  type LucideIcon,
} from "lucide-react";
import {
  Bread, Butter, Jar, Kiwi, Mushroom, Onion, Pasta, Peach, Pear, Pineapple, Potato, RiceBowl, SaltShaker, Sausage, Squid, Strawberry, Tissues, Tomato, Watermelon, Yogurt,
} from "./customIcons";

/** Icone disponibili per i prodotti del catalogo (campo "icon" in catalog.json). */
export const ICONS: Record<string, LucideIcon> = {
  Apple, Avocado, Baby, Bacon, Banana, Bath, Battery, Bean, Beef, Beer, BottleWine, Brush: BrushCleaning, Bubbles, Can, CanSoda, Carrot,
  Cat, Candy, Cheese, Cherry, ChocolateBar, Citrus, Coffee, Cookie, Croissant, Cuboid, Cupcake, CupSoda, CakeSlice, Dessert, Dog, Donut,
  Droplet, Droplets, Drumstick, Egg, Fish, Grape, Ham, Hamburger, IceCream, IceCreamBowl, LeafyGreen, Lightbulb, Martini, Milk, Mop, Nut,
  PawPrint, Pizza, Popcorn, Salad, Sandwich, Scroll, Shell, Shrimp, ShowerHead, SoapDispenserDroplet, Soup, Sparkles, SprayCan, Sprout,
  Snowflake, Sun, Toilet, Toothbrush, Trash2, TubeLotion, WashingMachine, Wheat, Wine, GlassWater,
  Bread, Butter, Jar, Kiwi, Mushroom, Onion, Pasta, Peach, Pear, Pineapple, Potato, RiceBowl, SaltShaker, Sausage, Squid, Strawberry, Tissues, Tomato, Watermelon, Yogurt,
  Carton,
};

export const iconFor = (name?: string): LucideIcon => (name && ICONS[name]) || ShoppingBasket;
