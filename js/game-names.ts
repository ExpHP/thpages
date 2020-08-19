/**
 * A game number as a string with no period, with a leading 0 for numbers below 10, e.g. "14", "125", "095".
 *
 * This representation is chosen to enable simple lexical comparisons using the built-in &lt; and &gt; operators.
 * Because they look like stringified integers, do not use them as object keys if you care about iteration order (use Maps).
 */
export type Game = '06' | '07' | '08' | '09' | '095' | '10' | '11' | '12' | '125' | '128' | '13' | '14' | '143' | '15' | '16' | '165' | '17';

export type GameData = {
  color: string,
  thname: string,
  long: string,
  short: string,
};

const GAMES = new Map([
  ['06', {color: "#ff5959", thname: "TH06", long: "Embodiment of Scarlet Devil", short: "EoSD"}],
  ['07', {color: "#62ffff", thname: "TH07", long: "Perfect Cherry Blossom", short: "PCB"}],
  ['08', {color: "#c0b6d6", thname: "TH08", long: "Imperishable Night", short: "IN"}],
  ['09', {color: "#ff82c0", thname: "TH09", long: "Phantasmagoria of Flower View", short: "PoFV"}],
  ['095', {color: "#ebc996", thname: "TH09.5", long: "Shoot the Bullet", short: "StB"}],
  ['10', {color: "#fafca2", thname: "TH10", long: "Mountain of Faith", short: "MoF"}],
  ['11', {color: "#adb0e6", thname: "TH11", long: "Subterranean Animism", short: "SA"}],
  ['12', {color: "lightgreen", thname: "TH12", long: "Undefined Fantastic Object", short: "UFO"}],
  ['125', {color: "orange", thname: "TH12.5", long: "Double Spoiler", short: "DS"}],
  ['128', {color: "#40ffeb", thname: "TH12.8", long: "Great Fairy Wars", short: "GFW"}],
  ['13', {color: "lightblue", thname: "TH13", long: "Ten Desires", short: "TD"}],
  ['14', {color: "#cf943a", thname: "TH14", long: "Double Dealing Character", short: "DDC"}],
  ['143', {color: "#ff9eb9", thname: "TH14.3", long: "Impossible Spell Card", short: "ISC"}],
  ['15', {color: "#f6d7ff", thname: "TH15", long: "Legacy of Lunatic Kingdom", short: "LoLK"}],
  ['16', {color: "#63f863", thname: "TH16", long: "Hidden Star in Four Seasons", short: "HSiFS"}],
  ['165', {color: "violet", thname: "TH16.5", long: "Violet Detector", short: "VD"}],
  ['17', {color: "#ff6565", thname: "TH17", long: "Wily Beast and Weakest Creature", short: "WBaWC"}],
]);

/** Iterate over all games, ordered ascendingly by number. */
export function allGames() {
  return GAMES.keys();
}

export function gameData(key: Game) {
  return GAMES.get(key)!;
}
