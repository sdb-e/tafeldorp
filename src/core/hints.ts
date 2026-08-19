// Ezelsbruggetjes per som: bij een fout antwoord leggen we een strategie uit
// met de echte getallen ingevuld (steunsommen, verdubbelen, omdraaien).

function brugVoorTafel(a: number, t: number): string | null {
  switch (t) {
    case 1:
      return `Keer 1 is gewoon het getal zelf: ${a} × 1 = ${a}.`;
    case 2:
      return `Keer 2 is dubbel! ${a} en nog een keer ${a}: dat is ${a} + ${a}.`;
    case 3:
      return `Keer 3 = dubbel en nog één keer: ${a} × 2 = ${a * 2}, plus ${a} erbij.`;
    case 4:
      return `Keer 4 = dubbel-dubbel: ${a} × 2 = ${a * 2}, en dat nog eens dubbel!`;
    case 5:
      return `Keer 5 is de helft van keer 10: ${a} × 10 = ${a * 10}, en daar de helft van.`;
    case 6:
      return `Keer 6 = keer 5 en nog één keer: ${a} × 5 = ${a * 5}, plus ${a} erbij.`;
    case 9:
      return `Keer 9 is bijna keer 10: ${a} × 10 = ${a * 10}, haal er één ${a} af.`;
    case 10:
      return `Keer 10? Plak een nul achter het getal: ${a} wordt ${a * 10}!`;
    default:
      return null;
  }
}

/** Beste ezelsbrug voor a x t, met omdraaien als het helpt. */
export function ezelsbrug(a: number, t: number): string {
  const direct = brugVoorTafel(a, t);
  if (direct) return direct;
  // geen trucje voor deze tafel: probeer de som om te draaien
  const gedraaid = brugVoorTafel(t, a);
  if (gedraaid) {
    return `Draai de som om: ${a} × ${t} is hetzelfde als ${t} × ${a}. ${gedraaid}`;
  }
  // buursom als laatste redmiddel (tafels 7 en 8)
  return `Weet je ${a - 1} × ${t} = ${(a - 1) * t}? Dan is ${a} × ${t} er precies ${t} meer!`;
}
