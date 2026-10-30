// Englische Fassung des Häkellexikons (shared/maschen.js): Name, Erklärung, Schritte je id.
// Fehlt name, setzt maschenEn() ihn aus den US-/UK-Namen zusammen („single crochet (US) / double crochet (UK)“).
// In den Erklärungen stehen US-Begriffe, bei Doppelbedeutung mit UK in Klammern.
const KATEGORIEN_EN = { grund: 'Basic stitches', zuab: 'Increases & decreases', glied: 'Where to insert', struktur: 'Texture stitches', begriff: 'Terms', technik: 'Techniques' };

const MASCHEN_EN = {
  lm: { text: 'The basis of almost every project: a chain of loops, e.g. as the foundation or for arches.',
    schritte: ['Yarn over.', 'Pull the yarn through the loop on the hook.'] },
  km: { text: 'The flattest stitch. Closes rounds, joins pieces or moves the yarn along without adding height.',
    schritte: ['Insert the hook into the stitch.', 'Yarn over and pull straight through both loops on the hook.'] },
  fm: { text: 'The most important stitch, dense and firm, standard for amigurumi. Careful: what UK patterns call “dc” is this stitch.',
    schritte: ['Insert the hook into the stitch, yarn over and pull up a loop (2 loops on the hook).', 'Yarn over, pull through both loops.'] },
  hstb: { text: 'A bit taller than single crochet (UK double crochet), soft but still dense.',
    schritte: ['Yarn over, insert the hook into the stitch, pull up a loop (3 loops).', 'Yarn over, pull through all 3 loops.'] },
  stb: { text: 'A tall stitch, about three times as high as a chain. Makes airy, fast-growing fabric, e.g. in a granny square. Careful: “dc” means this stitch only in US patterns.',
    schritte: ['Yarn over, insert the hook into the stitch, pull up a loop (3 loops).', 'Yarn over, pull through 2 loops.', 'Yarn over, pull through the last 2 loops.'] },
  dstb: { text: 'Like a double crochet (UK treble), but with two yarn overs at the start, so it is taller.',
    schritte: ['Yarn over twice, insert the hook, pull up a loop (4 loops).', 'Repeat 3 times: yarn over, pull through 2 loops.'] },
  dfstb: { text: 'One step taller again: three yarn overs at the start.',
    schritte: ['Yarn over 3 times, insert the hook, pull up a loop (5 loops).', 'Repeat 4 times: yarn over, pull through 2 loops.'] },
  zun: { text: '2 stitches into the same stitch; the round grows by 1 stitch. Unless stated otherwise, these are single crochet (UK double crochet).' },
  abn: { name: 'Decrease (sc2tog US / dc2tog UK)', text: '2 stitches are worked off together into one; the round shrinks by 1 stitch.',
    schritte: ['Insert the hook into the next stitch, pull up a loop.', 'Insert the hook into the following stitch, pull up a loop (3 loops).', 'Yarn over, pull through all 3 loops.'] },
  uabn: { text: 'A single crochet decrease that leaves almost no gaps in amigurumi. You only insert the hook into the front loops.',
    schritte: ['Insert the hook into the front loop of the next stitch, then straight into the front loop of the following one (3 loops).', 'Yarn over, pull through the 2 front loops (2 loops).', 'Yarn over, pull through both loops.'] },
  stb2zus: { text: 'A decrease made with double crochet (UK treble). Careful: “dc2tog” is this decrease in US patterns, but a single crochet decrease in UK patterns.',
    schritte: ['Yarn over, insert into the next stitch, pull up a loop, yarn over, pull through 2 loops.', 'Do the same in the following stitch (3 loops).', 'Yarn over, pull through all 3 loops.'] },
  fm3zus: { text: 'Like the decrease, but over 3 stitches: 3 stitches become 1.',
    schritte: ['Insert into each of the next 3 stitches and pull up a loop (4 loops).', 'Yarn over, pull through all 4 loops.'] },
  hmg: { text: 'Each stitch has two loops on top that look like a sideways V. If you only work into the back one, the front loop stays visible as a line. Makes ridges, or the edge where amigurumi form the base.' },
  vmg: { text: 'Insert the hook only into the front loop of the stitch. The back loop stays free, e.g. to crochet into it later (ruffles, hair).' },
  fadenring: { name: 'Magic ring', text: 'An adjustable start for rounds without a hole in the middle, standard for amigurumi.',
    schritte: ['Lay the yarn into a loop, insert the hook, pull up a loop.', '1 chain to secure (does not count as a stitch).', 'Work the stitches of round 1 around the ring and the tail.', 'Pull the tail until the ring is closed.'] },
  umschlag: { text: 'Wrap the yarn over the hook from back to front. Part of almost every stitch.' },
  ueberspringen: { text: 'Leave out the next stitch and insert into the one after it, e.g. for shells or mesh patterns.' },
  lmbogen: { text: 'The space under one or more chains. “Work into the chain space” means: insert around the chains, not into them.' },
  rstbv: { text: 'A double crochet (UK treble) worked around the post of the stitch below instead of into its top loops. Stands out to the front, e.g. for ribbing and cables.',
    schritte: ['Yarn over.', 'Insert from the front to the right of the post, go behind the post and come out to the front on its left.', 'Yarn over and finish the double crochet as usual.'] },
  rstbh: { text: 'Like the front post stitch, but worked around the post from the back. Recedes to the back.' },
  krebs: { text: 'Single crochet (UK double crochet) worked backwards (left to right for right-handers). Makes a twisted, cord-like edging.' },
  vmasche: { text: 'Usually 1 double crochet, 1 chain, 1 double crochet (UK: treble) into the same stitch. The pattern gives the exact recipe.' },
  muschel: { text: 'Several double crochet (UK: treble), often 5, into the same stitch. Usually stitches are skipped before and after so the work stays flat.' },
  bueschel: { text: 'Several unfinished double crochet (the last loop of each stays on the hook) are worked off together with one yarn over. The pattern says how many and where. Cluster, bobble and puff are not used consistently in German patterns.' },
  noppe: { text: 'A cluster of usually 4–5 unfinished double crochet (UK: treble) in the same stitch, worked off together. Pops out on the side facing away from you, so it is usually worked on wrong-side rows to sit on the right side.' },
  puff: { text: 'A soft, round stitch made of several long pulled-up loops in the same stitch.',
    schritte: ['Several times (usually 3–5): yarn over, insert into the same stitch, pull up a loop loosely.', 'Yarn over, pull through all loops.', 'Often 1 chain follows to close it.'] },
  popcorn: { text: 'A raised bump made of finished double crochet (UK: treble).',
    schritte: ['Work usually 5 double crochet into the same stitch.', 'Take the hook out of the loop and insert it from the front into the first of these stitches.', 'Pick up the loop again and pull it through.'] },
  xmasche: { text: 'Single crochet (UK double crochet) where you insert between the two vertical legs of the stitch below instead of under the top loops. Looks like knit stitches and stacks straight in rounds, good for tapestry. Firmer than normal single crochet, so crochet more loosely or use a bigger hook.' },
  picot: { text: 'A small knot of chains, e.g. for picot edges or claws. The pattern says how many chains, usually 3.',
    schritte: ['Make 3 chains.', 'Insert into the first of these chains (or the stitch they come from).', 'Close with 1 slip stitch.'] },
  kreuzstb: { text: 'Two double crochet (UK: treble) crossing each other. Makes a pattern of small Xs.',
    schritte: ['Skip 1 stitch, 1 dc into the next stitch.', '1 dc into the skipped stitch, in front of (or behind) the first one.'] },
  masche: { text: 'A single stitch. The number at the end of a round, e.g. “(18)”, is the stitch count you should have afterwards.' },
  runde: { text: 'You work in a circle without turning. Either joined (with a slip stitch) or as a spiral. German amigurumi patterns often write “R” for round.' },
  reihe: { text: 'You work back and forth; at the end of the row you turn the work. Careful: in German amigurumi patterns “R” often means round.' },
  wenden: { text: 'Flip the work at the end of the row so the other side faces you. Usually a turning chain follows.' },
  spirale: { text: 'Rounds without a slip stitch at the end; the next round starts straight in the first stitch of the previous one. Common in amigurumi. Put a stitch marker in the first stitch of each round, or you lose track of where the round starts.' },
  wlm: { text: 'Chains at the start of a row so the edge reaches the height of the stitches. Usual: single crochet 1 ch (does not count), half double crochet 2 ch, double crochet 3 ch (usually counts as the first stitch), treble 4 ch (US terms). The pattern says what applies.' },
  anschlag: { text: 'The chain you work the first row into. For single crochet you usually chain 1 more than the stitches you need.' },
  zus: { name: 'Together (tog)', text: 'Several stitches are not finished one by one but worked off together at the end. Appears in abbreviations like sc2tog or dc3tog (the number says how many).' },
  wdh: { text: 'Whatever is in brackets or between asterisks is worked as often as stated. “(sc, inc) x 6” means “1 sc, 1 inc” six times in a row. “Rep from *” means: once more from the asterisk.' },
  mm: { text: 'A small clip that marks a stitch, e.g. the start of the round. “pm” means “place marker”.' },
  abketten: { name: 'Fasten off and weave in ends', text: 'Cut the yarn leaving a tail, pull it through the last loop and tighten. Hide the end invisibly in the work with a needle.' },
  vsrs: { text: 'The nice outside and the inside of the work. In rows, right-side rows (RS) are worked facing the right side, wrong-side rows (WS) facing the back.' },
  maschenprobe: { name: 'Gauge (US) / tension (UK)', text: 'How many stitches and rows fit into e.g. 10 × 10 cm (4 × 4 in). Important for garments: more stitches than stated → use a bigger hook, fewer → a smaller one.' },
  farben: { name: 'Main colour / contrast colour', text: 'In multi-colour patterns the yarns are often called MC and CC, or colour A, B, C.' },
  farbwechsel: { name: 'Colour change', text: 'Pick up the new colour on the last pull-through of the stitch before; then the next stitch sits neatly in the new colour.' },
  abkuerz: { name: 'More English abbreviations', uk: 'same as US', text: 'beg = beginning, nxt = next, rem = remaining, prev = previous, ea = each, arnd = around. “sc in each st around” means: 1 sc in every stitch of the round.' },
  amigurumi: { text: 'Crocheted figures, usually in single crochet (UK double crochet) in continuous rounds starting from a magic ring. Crochet tightly (rather a smaller hook) so the stuffing does not show through.' },
  fuellen: { name: 'Stuffing', text: 'Stuff amigurumi with fibrefill while the opening is still big enough, usually a few rounds before closing. Stuff in small pieces and fairly firmly, or the shape sags over time. The stuffing must not show between the stitches.' },
  augen: { text: 'Plastic eyes with a post, secured from the inside with a washer. Insert before stuffing; the pattern gives the round and spacing (e.g. between R8 and R9, 6 sts apart). The washer is hard to remove afterwards, so check the position first. For toys for children under 3, better embroider the eyes.' },
  matratzenstich: { text: 'An almost invisible seam to sew on pieces like arms or ears, or to join two edges. With a yarn needle, go under one loop of each piece alternately and pull tight every few stitches; the yarn disappears between the stitches.' },
  granny: { text: 'A square of double crochet (UK: treble) groups that grows from the centre in rounds. Joined into blankets, bags or clothes.' },
  tapestry: { text: 'Multi-colour motifs following a grid: unused colours are carried loosely and crocheted over. From about 3 colours per row the fabric gets thick. Normal single crochet slants a little in rounds; waistcoat stitches stand straighter. The Grid Maker creates charts for it.' },
  c2c: { name: 'C2C (corner to corner)', text: 'Worked diagonally from one corner to the opposite one in small tiles (usually 3 ch + 3 dc). Each tile is one dot of the grid.' },
  mosaik: { text: 'Two-colour patterns: each row is worked in one colour only; the pattern comes from double crochet (UK: treble) worked over the previous row into the row below.' },
};

// Englische Fassung anwenden: name wird englisch, der deutsche Name bleibt als deName
function maschenEn(list) {
  const up = s => s.charAt(0).toUpperCase() + s.slice(1);
  for (const m of list) {
    const e = MASCHEN_EN[m.id] || {};
    m.deName = m.name;
    m.name = e.name || (m.us.name !== m.uk.name ? `${up(m.us.name)} (US) / ${m.uk.name} (UK)` : up(m.us.name));
    if (e.uk) m.uk = { ...m.uk, name: e.uk };
    if (e.text) m.text = e.text;
    if (e.schritte) m.schritte = e.schritte;
  }
  return list;
}

if (typeof module !== 'undefined') module.exports = { MASCHEN_EN, KATEGORIEN_EN, maschenEn };
