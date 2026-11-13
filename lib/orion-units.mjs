const UNITS = {
  length: { m: 1, km: 1000, cm: 0.01, mm: 0.001, mi: 1609.344, ft: 0.3048, in: 0.0254 },
  mass: { kg: 1, g: 0.001, mg: 0.000001, lb: 0.45359237 },
  volume: { l: 1, ml: 0.001, m3: 1000, gal: 3.785411784 },
  data: { B: 1, KB: 1000, MB: 1e6, GB: 1e9, TB: 1e12, KiB: 1024, MiB: 1048576, GiB: 1073741824 },
};
const ALIASES = {
  meter:"m",meters:"m",metre:"m",metres:"m",kilometer:"km",kilometers:"km",kilometre:"km",kilometres:"km",
  centimeter:"cm",centimeters:"cm",millimeter:"mm",millimeters:"mm",mile:"mi",miles:"mi",foot:"ft",feet:"ft",inch:"in",inches:"in",
  kilogram:"kg",kilograms:"kg",gram:"g",grams:"g",milligram:"mg",milligrams:"mg",pound:"lb",pounds:"lb",lbs:"lb",
  liter:"l",liters:"l",litre:"l",litres:"l",milliliter:"ml",milliliters:"ml",gallon:"gal",gallons:"gal",
  byte:"B",bytes:"B",kilobyte:"KB",megabyte:"MB",gigabyte:"GB",terabyte:"TB",
  c:"C",celsius:"C","°c":"C",f:"F",fahrenheit:"F","°f":"F",k:"K",kelvin:"K",
};
function normalizeUnit(value) {
  const raw = String(value || "").trim();
  return ALIASES[raw.toLowerCase()] || raw;
}
export function convertUnits(value, fromUnit, toUnit) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) throw new Error("Value must be a finite number.");
  const from = normalizeUnit(fromUnit);
  const to = normalizeUnit(toUnit);
  const temperature = ["C", "F", "K"];
  let result;
  let category;
  if (temperature.includes(from) || temperature.includes(to)) {
    if (!temperature.includes(from) || !temperature.includes(to)) throw new Error("Temperature units can only be converted to other temperature units.");
    category = "temperature";
    const celsius = from === "C" ? amount : from === "F" ? (amount - 32) * 5 / 9 : amount - 273.15;
    result = to === "C" ? celsius : to === "F" ? celsius * 9 / 5 + 32 : celsius + 273.15;
  } else {
    const group = Object.entries(UNITS).find(([, units]) => Object.hasOwn(units, from) && Object.hasOwn(units, to));
    if (!group) throw new Error("Unsupported unit pair. Supported categories: length, mass, volume, and digital storage.");
    [category] = group;
    result = amount * group[1][from] / group[1][to];
  }
  if (!Number.isFinite(result)) throw new Error("Converted value is outside the supported range.");
  return { value: amount, from, to, result, category };
}
