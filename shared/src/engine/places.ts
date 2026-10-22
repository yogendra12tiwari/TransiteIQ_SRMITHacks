import { z } from "zod";

export const PlaceCategory = z.enum([
  "landmark",
  "transit_hub",
  "education",
  "market",
  "residential",
  "commercial",
]);
export type PlaceCategory = z.infer<typeof PlaceCategory>;

export const Place = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  nameHi: z.string().optional(),
  category: PlaceCategory,
  lat: z.number(),
  lng: z.number(),
  description: z.string(),
  nearestStopIds: z.array(z.string()).default([]),
});
export type Place = z.infer<typeof Place>;

export const LUCKNOW_PLACES: Place[] = [
  {
    id: "place_lu",
    name: "Lucknow University",
    nameHi: "लखनऊ विश्वविद्यालय",
    category: "education",
    lat: 26.864,
    lng: 80.925,
    description: "Historic university campus in north-central Lucknow",
    nearestStopIds: ["stop_lu"],
  },
  {
    id: "place_charbagh",
    name: "Charbagh Railway Station",
    nameHi: "चारबाग रेलवे स्टेशन",
    category: "transit_hub",
    lat: 26.8315,
    lng: 80.923,
    description: "Main Lucknow junction railway terminal and metro station",
    nearestStopIds: ["stop_charbagh"],
  },
  {
    id: "place_hazratganj",
    name: "Hazratganj Main Market",
    nameHi: "हज़रतगंज मुख्य बाज़ार",
    category: "market",
    lat: 26.85,
    lng: 80.947,
    description: "Centrally located commercial and shopping district",
    nearestStopIds: ["stop_hazratganj"],
  },
  {
    id: "place_gomtinagar",
    name: "Gomti Nagar (Manoj Pandey Chauraha)",
    nameHi: "गोमती नगर",
    category: "commercial",
    lat: 26.856,
    lng: 81.001,
    description: "Eastern residential and IT hub near Lohia hospital",
    nearestStopIds: ["stop_gomtinagar"],
  },
  {
    id: "place_alambagh",
    name: "Alambagh Bus Terminal",
    nameHi: "आलमबाग बस स्टैंड",
    category: "transit_hub",
    lat: 26.813,
    lng: 80.901,
    description: "Interstate bus terminal and southern metro connection",
    nearestStopIds: ["stop_alambagh"],
  },
  {
    id: "place_aminabad",
    name: "Aminabad Bazaar",
    nameHi: "अमीनाबाद बाज़ार",
    category: "market",
    lat: 26.847,
    lng: 80.925,
    description: "Bustling traditional market and interchange node",
    nearestStopIds: ["stop_aminabad"],
  },
  {
    id: "place_chowk",
    name: "Chowk Heritage Old City",
    nameHi: "चौक हेरिटेज",
    category: "landmark",
    lat: 26.871,
    lng: 80.912,
    description: "Historic Lucknow culinary and handicraft center",
    nearestStopIds: ["stop_chowk"],
  },
  {
    id: "place_kaiserbagh",
    name: "Kaiserbagh Bus Station",
    nameHi: "कैसरबाग बस स्टेशन",
    category: "transit_hub",
    lat: 26.853,
    lng: 80.934,
    description: "Central bus terminus connecting regional corridors",
    nearestStopIds: ["stop_kaiserbagh"],
  },
  {
    id: "place_indiranagar",
    name: "Indira Nagar Commercial Area",
    nameHi: "इंदिरा नगर",
    category: "residential",
    lat: 26.876,
    lng: 80.993,
    description: "Major planned residential township and commercial market",
    nearestStopIds: ["stop_indiranagar"],
  },
  {
    id: "place_munshipulia",
    name: "Munshi Pulia Intersection",
    nameHi: "मुंशी पुलिया",
    category: "market",
    lat: 26.87,
    lng: 80.98,
    description: "Metro terminal junction and lively marketplace",
    nearestStopIds: ["stop_munshipulia"],
  },
  {
    id: "place_patrakar",
    name: "Patrakarpuram Market",
    nameHi: "पत्रकारपुरम",
    category: "commercial",
    lat: 26.86,
    lng: 80.996,
    description: "Heart of Gomti Nagar retail and cafe promenade",
    nearestStopIds: ["stop_patrakar"],
  },
  {
    id: "place_vibhuti",
    name: "Vibhuti Khand Cyber Heights",
    nameHi: "विभूति खंड",
    category: "commercial",
    lat: 26.865,
    lng: 81.01,
    description: "Modern office towers and technology corporate park",
    nearestStopIds: ["stop_vibhuti"],
  },
  {
    id: "place_naka",
    name: "Naka Hindola Electronics Market",
    nameHi: "नाका हिंडोला",
    category: "market",
    lat: 26.842,
    lng: 80.917,
    description: "Commercial electronics trading district near Charbagh",
    nearestStopIds: ["stop_naka"],
  },
  {
    id: "place_lohia_crossing",
    name: "Lohia Path Crossing (Demo Origin)",
    nameHi: "लोहिया पथ क्रॉसिंग",
    category: "residential",
    lat: 26.853,
    lng: 80.9645,
    description: "Residential junction equidistant to Stop A and Stop B",
    nearestStopIds: ["stop_A", "stop_B", "stop_lohia"],
  },
];

export function findPlaceById(id: string): Place | undefined {
  return LUCKNOW_PLACES.find((p) => p.id === id);
}

export function searchPlaces(query: string): Place[] {
  const q = query.trim().toLowerCase();
  if (!q) return LUCKNOW_PLACES;
  return LUCKNOW_PLACES.filter(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      (p.nameHi && p.nameHi.includes(q)) ||
      p.description.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q),
  );
}
