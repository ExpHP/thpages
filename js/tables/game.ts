/**
 * A game number as a string with no period, with a leading 0 for numbers below 10, e.g. "14", "125", "095".
 *
 * This representation is chosen to enable simple lexical comparisons using the built-in &lt; and &gt; operators.
 * Because they look like stringified integers, do not use them as object keys if you care about iteration order (use Maps).
 */
export type Game = '06' | '07' | '08' | '09' | '095' | '10' | '11' | '12' | '125' | '128' | '13' | '14' | '143' | '15' | '16' | '165' | '17' | '18';

export type GameData = {
  thname: string,
  long: string,
  short: string,
};

const GAMES = new Map<Game, GameData>([
  ['06', {thname: "TH06", long: "Embodiment of Scarlet Devil", short: "EoSD"}],
  ['07', {thname: "TH07", long: "Perfect Cherry Blossom", short: "PCB"}],
  ['08', {thname: "TH08", long: "Imperishable Night", short: "IN"}],
  ['09', {thname: "TH09", long: "Phantasmagoria of Flower View", short: "PoFV"}],
  ['095', {thname: "TH09.5", long: "Shoot the Bullet", short: "StB"}],
  ['10', {thname: "TH10", long: "Mountain of Faith", short: "MoF"}],
  ['11', {thname: "TH11", long: "Subterranean Animism", short: "SA"}],
  ['12', {thname: "TH12", long: "Undefined Fantastic Object", short: "UFO"}],
  ['125', {thname: "TH12.5", long: "Double Spoiler", short: "DS"}],
  ['128', {thname: "TH12.8", long: "Great Fairy Wars", short: "GFW"}],
  ['13', {thname: "TH13", long: "Ten Desires", short: "TD"}],
  ['14', {thname: "TH14", long: "Double Dealing Character", short: "DDC"}],
  ['143', {thname: "TH14.3", long: "Impossible Spell Card", short: "ISC"}],
  ['15', {thname: "TH15", long: "Legacy of Lunatic Kingdom", short: "LoLK"}],
  ['16', {thname: "TH16", long: "Hidden Star in Four Seasons", short: "HSiFS"}],
  ['165', {thname: "TH16.5", long: "Violet Detector", short: "VD"}],
  ['17', {thname: "TH17", long: "Wily Beast and Weakest Creature", short: "WBaWC"}],
  ['18', {thname: "TH18", long: "Unconnected Marketeers", short: "UM"}],
]);

/** Iterate over all games, ordered ascendingly by number. */
export function allGames() {
  return GAMES.keys();
}

/** A very strict form of `parseGame` for strings that should already be known to be valid. */
export function validateGame(s: string): Game | null {
  return GAMES.has(s as Game) ? s as Game : null;
}

export function gameData(key: Game) {
  return GAMES.get(key)!;
}

/** Reads game strings that may have been inputted by a user somewhere. Tries to be a bit more liberal in accepting input. */
export function parseGame(s: string): Game | null {
  s = s.replace(/^th/i, ''); // e.g. th14
  s = s.replace(/\./, ''); // e.g. 14.3
  if (s.length === 1) s = `0${s}`; // e.g. 8
  return validateGame(s);
}
