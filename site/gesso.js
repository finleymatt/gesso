/* Gesso — shared data, chip math, generative stand-in art, and site chrome. */
(function () {
  'use strict';
  const G = (window.G = {});

  /* ================= storage (per-viewer conveniences; page works without it) ================= */
  const store = {
    get(k, d) { try { const v = localStorage.getItem('gesso:' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('gesso:' + k, JSON.stringify(v)); } catch (e) { /* private mode */ } },
    del(k) { try { localStorage.removeItem('gesso:' + k); } catch (e) {} }
  };
  G.store = store;

  /* ================= chip economics =================
     price per chip = $1 × √(1 + collectors ÷ 10)
     buyers earn 10% of what they spend, in that artist's chips, at today's price
     the first 25 collectors of every artist earn double
     chips can cover up to half of any piece on Gesso */
  G.EARN = 0.10;
  G.FOUNDING = 25;
  G.SPEND_CAP = 0.5;
  G.SPLIT = { artist: 0.80, reserve: 0.12, gesso: 0.08 };
  G.price = (n) => Math.sqrt(1 + n / 10);
  G.isFounding = (n) => n < G.FOUNDING;
  G.chipsFor = (usd, n, rate = G.EARN) => (usd * rate / G.price(n)) * (G.isFounding(n) ? 2 : 1);

  /* ================= artists =================
     HAMEL is the real founding artist; everyone else is a sample creator for the preview. */
  const ARTISTS = [
    {
      slug: 'hamel', name: 'HAMEL', ticker: 'HAMEL', color: '#E3156B', on: '#FFFFFF', style: 'hamel',
      handle: '@justintime7189', ig: 'https://www.instagram.com/justintime7189/', city: '',
      collectors: 312, joined: 'Founding artist since 2026', sold: 41, real: true,
      quote: 'KEEP GOING.',
      commission: { rate: 150, min: 1, max: 4, title: 'Listening session', text: 'Book an hour with Justin. You talk, Justin listens: the stories, the things you might not say to anyone else. Then Justin paints from what was heard.' },
      photos: { avatar: 'art/justin/j26.jpg', portrait: 'art/justin/j29.jpg', p1: 'art/justin/j25.jpg', p2: 'art/hamel-mural.jpg', p3: 'art/hamel-studio.jpg' },
      // cover strip: Justin's own photos of the work
      banner: ['art/justin/j02.jpg', 'art/justin/j16.jpg', 'art/justin/j11.jpg', 'art/justin/j06.jpg', 'art/justin/j19.jpg', 'art/justin/j20.jpg', 'art/justin/j12.jpg'],
      short: 'Loud color, thick black line, and eyes in everything.',
      bio: 'HAMEL paints the way a city sounds: packed, overlapping, and wide awake. Black contour holds neon fields together, faces hide in the patterns, and every surface (canvas, panel, brick) gets the same treatment. HAMEL was the first artist on Gesso and the reason it exists.'
    },
    {
      slug: 'odalys', name: 'Odalys Fuente', ticker: 'ODLY', color: '#2A2930', on: '#F4F4F0', style: 'mono',
      city: 'Oaxaca, MX', collectors: 128, joined: 'Joined March 2026', sold: 17,
      quote: 'One line, until it runs out.',
      short: 'Ink contour drawings, one unbroken line at a time.',
      bio: 'Odalys draws in sumi ink and acrylic, building rippling contour fields from a single continuous line. The pieces read like topographic maps of breathing.'
    },
    {
      slug: 'teo', name: 'Teo Marchetti', ticker: 'TEO', color: '#D4931C', on: '#1D1608', style: 'field',
      city: 'Turin, IT', collectors: 76, joined: 'Joined April 2026', sold: 9,
      quote: 'Color is a room you can stand in.',
      short: 'Soft-edged color fields in oil and cold wax.',
      bio: 'Teo layers oil and cold wax into hovering fields of color. Each painting takes months and carries the light of the studio on Via Nizza where it was made.'
    },
    {
      slug: 'ama', name: 'Ama Korsah', ticker: 'AMA', color: '#2140E3', on: '#FFFFFF', style: 'bauhaus',
      city: 'Accra, GH', collectors: 210, joined: 'Joined February 2026', sold: 33,
      quote: 'Pattern is memory you can count.',
      short: 'Geometric painting drawn from kente and market signage.',
      bio: 'Ama builds hard-edged geometric paintings from the grids of kente cloth and hand-painted market signs. Every color in a piece is mixed to match something she saw that week.'
    },
    {
      slug: 'june', name: 'June Watanabe', ticker: 'JUNE', color: '#FF4FA0', on: '#24061A', style: 'riso',
      city: 'Osaka, JP', collectors: 95, joined: 'Joined May 2026', sold: 58,
      quote: 'Misregistration is the good part.',
      short: 'Risograph prints in fluorescent pink and teal.',
      bio: 'June runs a two-drum risograph out of a former noodle shop. Small editions, loud inks, and botanical shapes that never quite line up, on purpose.'
    },
    {
      slug: 'ruben', name: 'Ruben Castillo', ticker: 'RUBN', color: '#16865A', on: '#FFFFFF', style: 'topo',
      city: 'Albuquerque, NM', collectors: 40, joined: 'Joined July 2026', sold: 6,
      quote: 'The desert is drawn in contour.',
      short: 'Contour paintings of the high desert.',
      bio: 'Ruben paints survey-map contours of arroyos and mesas from field sketches he makes on foot. He grinds some of his own pigments from the places he paints.'
    },
    {
      slug: 'mika', name: 'Mika Laine', ticker: 'MIKA', color: '#F2621E', on: '#200A00', style: 'photo',
      city: 'Helsinki, FI', collectors: 23, joined: 'Joined September 2026', sold: 4,
      quote: 'In June the sun just leans.',
      short: 'Photographs of the midnight sun over the Baltic.',
      bio: 'Mika photographs the Baltic coast between midnight and 3am in summer, when the sun never fully sets. Archival pigment prints in small, numbered editions.'
    }
  ];

  /* ================= works =================
     [id, title, year, medium, wIn, hIn, price, kind, extra] */
  const W = (artist, rows) => rows.map(([n, title, year, medium, w, h, price, edition, opt]) =>
    Object.assign({ id: artist + '-' + n, artist, title, year, medium, w, h, price, edition: edition || 'Original', sold: false }, opt || {}));
  const WORKS = [].concat(
    // HAMEL's real paintings (photos from Instagram). Titles, sizes and prices are placeholders until HAMEL confirms them.
    W('hamel', [
      ...[['j16', 'Breathe'], ['j11', 'Blue Bird'], ['j02', 'Pink Machine'], ['j06', 'Crowns'], ['j19', 'Love and Energy'], ['j12', 'Happy Birthday'],
        ['j01', 'Hand and Heart'], ['j18', 'Street to the Museum'], ['j20', 'Petals'], ['j17', 'Trust, Love, Joy'], ['j03', 'Big Loop'], ['j05', 'Feathers and Eyes'],
        ['j07', 'Politics'], ['j08', 'Dark Green'], ['j09', 'Blue Lines'], ['j10', 'Green Figure'], ['j13', 'Maze'], ['j14', 'Black and White I'],
        ['j15', 'Black and White II'], ['j27', 'Black and White III'], ['j04', 'Written Over'], ['j21', 'What Does It Mean to Be Free']
      ].map(([k, t], i) => [k, `Untitled (${t})`, 2026, 'Acrylic and paint marker on paper', 11.81, 15.75, [380, 420, 450, 480, 520, 560, 620][i % 7], null, { img: `art/justin/${k}.jpg`, cm: [30, 40] }]),
      ['j22', 'Untitled (Blue Field)', 2026, 'Acrylic on canvas', 23.6, 31.5, 1600, null, { img: 'art/justin/j22.jpg', cm: [60, 80] }],
      ['j23', 'Untitled (Pink Field)', 2026, 'Acrylic on canvas', 23.6, 31.5, 1600, null, { img: 'art/justin/j23.jpg', cm: [60, 80] }],
      ['j24', 'Untitled (Gray Field)', 2026, 'Acrylic on canvas', 31.5, 33.9, 1900, null, { img: 'art/justin/j24.jpg', cm: [80, 86] }],
      ['01', 'Untitled (Neon Faces)', 2026, 'Acrylic and paint marker on canvas', 35, 40, 1850, null, { img: 'art/hamel-01.jpg' }],
      ['02', 'Untitled (Green Eyes)', 2026, 'Acrylic and spray paint on canvas', 30, 40, 960, null, { img: 'art/hamel-02.jpg' }],
      ['03', 'Untitled (Ribbons)', 2026, 'Acrylic on canvas', 31, 40, 1400, null, { img: 'art/justin/j25.jpg' }],
      ['04', 'Untitled (Gray Matter)', 2026, 'Acrylic and ink on canvas', 28, 40, 1200, null, { img: 'art/justin/j28.jpg' }],
      ['05', 'Untitled (Dope)', 2026, 'Acrylic and spray paint on canvas', 36, 48, 2400, null, { img: 'art/hamel-05.jpg', sold: true, by: 128 }],
      ['06', 'Untitled (Ribbons), print', 2026, 'Giclée on cotton rag', 12, 16, 140, 'Edition of 40', { img: 'art/justin/j25.jpg' }],
      ['07', 'Untitled (Chaos Here, Peace There)', 2026, 'Spray paint and marker on canvas', 30, 40, 880, null, { img: 'art/hamel-07.jpg' }],
      ['08', 'Untitled (Spray Study)', 2026, 'Spray paint and acrylic on canvas', 26, 36, 620, null, { img: 'art/hamel-08.jpg' }]
    ]),
    W('odalys', [
      ['01', 'Contour for a Sleeping River', 2026, 'Sumi ink and acrylic on canvas', 24, 36, 1100],
      ['02', 'Ink Weather II', 2026, 'Sumi ink on paper', 16, 20, 480],
      ['03', 'The Long Listening', 2025, 'Sumi ink and acrylic on linen', 30, 30, 1350, null, { sold: true, by: 74 }],
      ['04', 'Map of a Breath', 2026, 'Risograph on Munken', 12, 16, 90, 'Edition of 30']
    ]),
    W('teo', [
      ['01', 'Ochre Hour', 2026, 'Oil and cold wax on canvas', 40, 50, 2400],
      ['02', 'Two Rooms, One Light', 2026, 'Oil and cold wax on canvas', 30, 40, 1750],
      ['03', 'Low Sun Study', 2026, 'Oil on panel', 16, 12, 380],
      ['04', 'Brick and Breath', 2025, 'Oil and cold wax on linen', 36, 36, 1900, null, { sold: true, by: 51 }]
    ]),
    W('ama', [
      ['01', 'Kente Arithmetic', 2026, 'Acrylic on canvas', 30, 30, 1200],
      ['02', 'Market Day Grid', 2026, 'Acrylic on panel', 24, 32, 880],
      ['03', 'Indigo Sum', 2026, 'Acrylic and indigo on canvas', 20, 20, 560],
      ['04', 'Small Geometry No. 9', 2026, 'Screenprint on Somerset', 12, 12, 75, 'Edition of 50']
    ]),
    W('june', [
      ['01', 'Night Garden, Pink Plate', 2026, 'Two-color risograph', 11, 17, 65, 'Edition of 60'],
      ['02', 'Two Persimmons', 2026, 'Two-color risograph', 14, 11, 55, 'Edition of 40'],
      ['03', 'Ferry Morning', 2026, 'Three-color risograph', 17, 22, 110, 'Edition of 30'],
      ['04', 'Ghost Fern', 2025, 'Two-color risograph', 11, 17, 65, 'Edition of 60', { sold: true, by: 88 }]
    ]),
    W('ruben', [
      ['01', 'Sandia Contours', 2026, 'Acrylic and earth pigment on canvas', 24, 30, 780],
      ['02', 'Arroyo Memory', 2026, 'Acrylic on panel', 18, 24, 520],
      ['03', 'High Desert Survey', 2026, 'Acrylic and earth pigment on canvas', 48, 36, 1650],
      ['04', 'Dry Wash', 2026, 'Acrylic on panel', 12, 12, 240]
    ]),
    W('mika', [
      ['01', 'Midsummer, 01:12', 2026, 'Archival pigment print', 30, 20, 420, 'Edition of 15'],
      ['02', 'Kaivopuisto Blue', 2026, 'Archival pigment print', 24, 16, 340, 'Edition of 15'],
      ['03', 'The Sun Never Quite Left', 2026, 'Archival pigment print', 36, 24, 680, 'Edition of 10'],
      ['04', 'Baltic, Late', 2026, 'Archival pigment print', 18, 12, 180, 'Edition of 25']
    ])
  );

  G.artists = ARTISTS;
  G.works = WORKS;
  G.artist = (slug) => ARTISTS.find((a) => a.slug === slug) || TALENT.find((t) => t.slug === slug);
  G.creatorUrl = (slug) => (ARTISTS.find((a) => a.slug === slug) ? `artist.html#${slug}` : `book.html#${slug}`);
  G.work = (id) => WORKS.find((w) => w.id === id);
  G.worksBy = (slug) => WORKS.filter((w) => w.artist === slug);

  /* ================= objects: print-on-demand goods made from an artist's work ================= */
  const TYPES = {
    wallpaper: { name: 'Wallpaper', price: 120, unit: 'roll', opts: ['Peel and stick', 'Traditional paste'], desc: 'Matte, made to order. Each roll covers 20.5 in × 33 ft (about 56 sq ft).' },
    apron: { name: 'Studio apron', price: 48, opts: ['One size'], desc: 'Hemp and organic cotton canvas with cross-back straps and a split front pocket.' },
    tote: { name: 'Hemp tote', price: 32, opts: ['One size'], desc: 'Natural hemp canvas, 15 × 16 in, with a full-color print.' },
    tee: { name: 'T-shirt', price: 38, opts: ['S', 'M', 'L', 'XL', 'XXL'], desc: 'Heavyweight organic cotton, relaxed fit. Never polyester.' },
    hoodie: { name: 'Build-your-own hoodie', price: 118, opts: ['S', 'M', 'L', 'XL', 'XXL'], desc: 'Choose the art for the front, back and sleeves, the fabric and the thread. Hemp, organic cotton or linen only.', custom: true },
    print: { name: 'Print', price: 45, opts: ['12 × 16 in poster', '18 × 24 in giclée', '24 × 32 in giclée'], optPrice: [45, 95, 160], desc: 'Archival print of the original, made to order. Add a frame and it ships ready to hang.' },
    deck: { name: 'Skate deck', price: 85, opts: ['8.0 in', '8.25 in', '8.5 in'], desc: 'Seven-ply Canadian maple. Ride it or hang it.' },
    pillow: { name: 'Throw pillow', price: 55, opts: ['18 × 18 in', '22 × 22 in'], desc: 'Linen cover printed on both sides, with a plant-fiber kapok insert.' },
    mug: { name: 'Mug', price: 24, opts: ['11 oz', '15 oz'], desc: 'Ceramic, printed all the way around. Dishwasher safe.' }
  };
  const PRODUCTS = [];
  [['hamel', { hoodie: 'hamel-j16', wallpaper: 'hamel-03', apron: 'hamel-j11', tote: 'hamel-j19', tee: 'hamel-j02', deck: 'hamel-j06', pillow: 'hamel-04', mug: 'hamel-03' }],
   ['odalys', { wallpaper: 'odalys-01', tee: 'odalys-02', mug: 'odalys-04' }],
   ['teo', { pillow: 'teo-01', tote: 'teo-02' }],
   ['ama', { wallpaper: 'ama-01', pillow: 'ama-03', apron: 'ama-02' }],
   ['june', { tote: 'june-01', tee: 'june-03', pillow: 'june-02' }],
   ['ruben', { deck: 'ruben-03', mug: 'ruben-01' }],
   ['mika', { pillow: 'mika-03', mug: 'mika-01' }]
  ].forEach(([artist, map]) => Object.entries(map).forEach(([type, src]) =>
    PRODUCTS.push(Object.assign({ id: artist + '-' + type, artist, type, src }, TYPES[type]))));
  // every work also comes as a print
  WORKS.forEach((w) => { if (w.edition === 'Original') PRODUCTS.push(Object.assign({ id: w.id + '-print', artist: w.artist, type: 'print', src: w.id }, TYPES.print, { name: 'Print of ' + w.title })); });
  G.types = TYPES;
  G.products = PRODUCTS;
  G.product = (id) => PRODUCTS.find((p) => p.id === id);
  G.productsBy = (slug) => PRODUCTS.filter((p) => p.artist === slug && p.type !== 'print');
  G.optPrice = (p, opt) => (p.optPrice ? p.optPrice[Math.max(0, p.opts.indexOf(opt))] : p.price);

  /* framing, by framing partners who ship the piece ready to hang */
  G.FRAMES = { none: { name: 'No frame', rate: 0 }, black: { name: 'Black wood', rate: 1.6 }, oak: { name: 'Natural oak', rate: 2.0 }, float: { name: 'White mat, black frame', rate: 2.4 } };
  G.framePrice = (w, f) => (!f || f === 'none' ? 0 : Math.round(2 * (w.w + w.h) * G.FRAMES[f].rate + 25));

  /* ================= places to see the work in person ================= */
  // HAMEL's entries are placeholders until HAMEL confirms where work can be seen.
  const VENUES = [
    { id: 'hamel-studio', artist: 'hamel', type: 'Studio', name: "HAMEL's studio", area: 'Address shared when your visit is confirmed', city: '', hours: 'Visits by appointment', book: true, tbd: true },
    { id: 'hamel-mural', artist: 'hamel', type: 'Mural', name: 'The Message', area: 'Street mural, location shared with collectors', city: '', hours: 'Outdoors, always open', img: 'art/hamel-mural.jpg', tbd: true },
    { id: 'odalys-taller', artist: 'odalys', type: 'Studio', name: 'Taller Fuente', area: 'Jalatlaco', city: 'Oaxaca, MX', hours: 'Thu to Sat, 11:00 to 18:00', days: [4, 5, 6] },
    { id: 'odalys-show', artist: 'odalys', type: 'Exhibition', name: 'Líneas, a group show', area: 'Centro', city: 'Oaxaca, MX', hours: 'Nov 7 to Dec 20, Tue to Sun 10:00 to 19:00', soon: 'Opens Nov 7' },
    { id: 'teo-studio', artist: 'teo', type: 'Open studio', name: 'Studio Marchetti', area: 'San Salvario', city: 'Turin, IT', hours: 'Open studio weekend, Nov 15 and 16, 12:00 to 19:00', soon: 'Nov 15 and 16' },
    { id: 'ama-shop', artist: 'ama', type: 'Gallery', name: 'Korsah Studio and Shop', area: 'Osu', city: 'Accra, GH', hours: 'Tue to Sat, 10:00 to 17:00', days: [2, 3, 4, 5, 6] },
    { id: 'june-press', artist: 'june', type: 'Print shop', name: 'Noodle Shop Press', area: 'Nakazakicho', city: 'Osaka, JP', hours: 'Fri to Sun, 12:00 to 19:00', days: [5, 6, 0] },
    { id: 'ruben-studio', artist: 'ruben', type: 'Studio', name: 'Old Town studio', area: 'Old Town', city: 'Albuquerque, NM', hours: 'Visits by appointment', book: true },
    { id: 'mika-popup', artist: 'mika', type: 'Pop-up', name: 'Midnight Sun pop-up', area: 'Kallio', city: 'Helsinki, FI', hours: 'Dec 1 to 14, daily 12:00 to 20:00', soon: 'Dec 1 to 14' }
  ];
  G.venues = VENUES;
  G.venuesBy = (slug) => VENUES.filter((v) => v.artist === slug);
  G.TODAY = new Date(2026, 9, 17);
  G.openToday = (v) => !!(v.days && v.days.includes(G.TODAY.getDay()));
  G.directions = (v) => (v.tbd ? null : 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(v.area + ', ' + v.city));

  /* ================= projects: fund something specific an artist wants to make ================= */
  // Sample creators for FAME (Food, Art, Music, Experience). Booking them earns their chips.
  const TALENT = [
    { slug: 'justin-chef', name: 'Justin (HAMEL)', kind: 'Chef', city: 'Shared when you book', ticker: 'HAMEL', color: '#E3156B', on: '#fff', collectors: 312, rate: 900, unit: 'dinner for 8', example: true,
      line: 'Thirteen years as a chef. A private dinner with live painting at the table.', tags: ['Private dinner', 'Live painting'], img: 'art/justin/j29.jpg' },
    { slug: 'nia-dj', name: 'Nia Osei', kind: 'DJ', city: 'Chicago, IL', ticker: 'NIA', color: '#7B3BFF', on: '#fff', collectors: 64, rate: 450, unit: '3-hour set', line: 'House and Afrobeat for rooftops, openings and long dinners.', tags: ['House', 'Afrobeat', 'Openings'] },
    { slug: 'leo-chef', name: 'Leo Martín', kind: 'Chef', city: 'Mexico City, MX', ticker: 'LEO', color: '#D4931C', on: '#1D1608', collectors: 41, rate: 650, unit: 'dinner for 10', line: 'Wood-fire tasting menus built around what the market had that morning.', tags: ['Wood fire', 'Tasting menu'] },
    { slug: 'ines-film', name: 'Inès Laurent', kind: 'Filmmaker', city: 'Paris, FR', ticker: 'INES', color: '#2A2930', on: '#F4F4F0', collectors: 28, rate: 1200, unit: 'day', line: 'Short documentaries about artists at work. Studio days and event films.', tags: ['Documentary', 'Event film'] },
    { slug: 'kofi-music', name: 'Kofi Mensah Trio', kind: 'Musician', city: 'Accra, GH', ticker: 'KOFI', color: '#16865A', on: '#fff', collectors: 57, rate: 800, unit: 'evening', line: 'Highlife and jazz for dinners, galleries and weddings.', tags: ['Highlife', 'Jazz', 'Live'] },
    { slug: 'mara-ceramics', name: 'Mara Vos', kind: 'Artisan', city: 'Rotterdam, NL', ticker: 'MARA', color: '#C47C5C', on: '#fff', collectors: 33, rate: 85, unit: 'workshop seat', line: 'Wheel-thrown tableware and two-hour throwing workshops.', tags: ['Ceramics', 'Workshops'] },
    { slug: 'sam-dj', name: 'Sam Rivera', kind: 'DJ', city: 'Los Angeles, CA', ticker: 'SAMR', color: '#00A8FF', on: '#04121C', collectors: 19, rate: 380, unit: '3-hour set', line: 'Soul, disco and edits. Brings their own records.', tags: ['Soul', 'Disco', 'Vinyl'] },
    { slug: 'tomas-chef', name: 'Tomás Reyes', kind: 'Chef', city: 'Albuquerque, NM', ticker: 'TOMS', color: '#16865A', on: '#fff', collectors: 22, rate: 520, unit: 'dinner for 8', line: 'New Mexican chile, heirloom corn and blue-corn everything.', tags: ['Regional', 'Family style'] }
  ];
  G.talent = TALENT;
  G.KINDS = ['Chef', 'DJ', 'Musician', 'Filmmaker', 'Artisan'];

  /* ================= partners: places that take chips ================= */
  // Sample partners for the preview. Gesso House is the planned flagship space.
  G.partners = [
    { name: 'Gesso House', kind: 'Flagship space', city: 'City to be announced', text: 'Gallery, café and event room. Spend chips on art, coffee and FAME nights.', planned: true, color: '#16151B' },
    { name: 'Tinted Art Supply', kind: 'Art supply store', city: 'Chicago, IL', text: 'Pay up to half of any order in chips. Artists on Gesso get 15% off.', color: '#D4931C' },
    { name: 'Frame Society', kind: 'Framing partner', city: 'Ships nationwide', text: 'Frames every Gesso piece that ships framed. Chips accepted on custom framing.', color: '#B98A57' },
    { name: 'Common Thread', kind: 'Hemp clothing', city: 'Portland, OR', text: 'Makes the Gesso hoodies and tees. Hemp, organic cotton and linen only.', color: '#16865A' },
    { name: 'Low Tide Coffee', kind: 'Café', city: 'Los Angeles, CA', text: 'Rotating Gesso artist on the wall. Chips cover your coffee.', color: '#2140E3' },
    { name: 'Second Press', kind: 'Print studio', city: 'Osaka, JP', text: "Prints Gesso's risograph editions. Chips accepted on open print days.", color: '#FF4FA0' }
  ];

  /* ================= collector votes ================= */
  // The four founding members hold 51% of every vote; everyone who has put money in shares the other 49%, weighted by what they've spent.
  G.proposals = [
    { id: 'hoodies', title: 'Launch the hemp hoodie line', text: 'Build-your-own hoodies in hemp, organic cotton and linen, made by Common Thread.', yes: 72, ends: 'Ends Oct 24' },
    { id: 'house', title: 'Open the first Gesso House', text: 'A gallery, café and event room where chips can be spent in person.', yes: 64, ends: 'Ends Nov 2' },
    { id: 'fame', title: 'Bring chefs and DJs onto Gesso (FAME)', text: 'Book food, music and experiences on Gesso, and earn the creator\'s chips for every booking.', yes: 81, ends: 'Ends Oct 30' }
  ];

  const PROJECTS = [
    { id: 'hamel-wall', artist: 'hamel', example: true, title: 'Scale it up: a 40-foot wall', img: 'art/hamel-mural.jpg',
      goal: 15000, raised: 9420, backers: 138, daysLeft: 19,
      story: "HAMEL wants to take the work from canvas to the side of a building. Backing covers paint, a lift, permits and two weeks of painting time. If the goal isn't reached, nobody is charged.",
      budget: [['Paint, primer and clear coat', 4200], ['Lift rental, 14 days', 3800], ['Permits and insurance', 1900], ['Artist time, two weeks', 5100]],
      rewards: [
        { amt: 25, title: 'Name on the wall', text: 'Your name in the credits corner of the finished mural.' },
        { amt: 100, title: 'Signed print of the wall', text: 'An 11 × 14 in print of the finished mural, signed.' },
        { amt: 500, title: 'Original mural study', text: 'One of the paper studies for the wall, signed and dated.', left: 11 },
        { amt: 2500, title: 'A day on the lift', text: 'Paint a section with HAMEL and take home a panel from the test wall.', left: 2 }
      ],
      updates: [['Oct 12', 'Example update: the test wall is finished and the colors hold up in full sun.'], ['Oct 3', 'Example update: past the halfway mark, and the permit application is in.']] },
    { id: 'june-drum', artist: 'june', title: 'A second risograph drum', img: null, art: 'june-03', goal: 4000, raised: 3610, backers: 212, daysLeft: 6,
      story: 'A second color drum means three-color prints without a week of waiting between passes. June will run a backers-only edition on the first day it arrives.',
      budget: [['Used two-color drum', 2900], ['Shipping from Tokyo', 450], ['Ink and paper for the first run', 650]],
      rewards: [{ amt: 15, title: 'First-run print', text: 'A small print from the first run on the new drum.' }, { amt: 40, title: 'Three-print bundle', text: 'Three prints from the first week.' }, { amt: 150, title: 'Your own edition', text: 'June prints a design you choose, edition of 10, all yours.', left: 4 }],
      updates: [['Oct 14', 'A drum is on hold at a shop in Tokyo until the 23rd.']] },
    { id: 'ruben-trip', artist: 'ruben', title: 'Pigment field trip: Four Corners', img: null, art: 'ruben-03', goal: 3000, raised: 820, backers: 31, daysLeft: 27,
      story: 'Ten days on foot across the Four Corners to sketch and collect earth for a new series. Every backer gets a vial of hand-ground pigment.',
      budget: [['Truck and fuel', 900], ['Permits and camping', 600], ['Grinding and binding supplies', 700], ['Ten days of studio time', 800]],
      rewards: [{ amt: 20, title: 'A vial of pigment', text: 'Hand-ground earth from the trip, labeled with where it came from.' }, { amt: 120, title: 'Field sketch', text: 'An original pencil sketch from the trail.' }, { amt: 600, title: 'First painting from the series', text: 'First pick of the finished paintings, with your pledge counted toward the price.', left: 3 }],
      updates: [] }
  ];
  G.projects = PROJECTS;
  G.project = (id) => PROJECTS.find((p) => p.id === id);
  G.projectBy = (slug) => PROJECTS.find((p) => p.artist === slug);
  G.pledged = (p) => ((store.get('pledged', {}) || {})[p.id] || 0);
  G.raised = (p) => p.raised + G.pledged(p);

  /* ================= milestones: what you've spent on Gesso unlocks more ================= */
  G.TIERS = [
    { name: 'Gesso', at: 0, rate: 0.10, perks: ['10% back in chips on everything'] },
    { name: 'Primer', at: 250, rate: 0.10, perks: ['See new work 24 hours before everyone else'] },
    { name: 'Underpainting', at: 1000, rate: 0.11, perks: ['11% back in chips', 'Book studio visits with any artist'] },
    { name: 'Glaze', at: 5000, rate: 0.12, perks: ['12% back in chips', 'Weekly drip: 1% of your chips paid to your bank each week', 'Free white-glove install on every original'] },
    { name: 'Varnish', at: 10000, rate: 0.13, perks: ['13% back in chips', 'A hosted studio visit every year', 'First look at every artist project'] },
    { name: 'Masterwork', at: 20000, rate: 0.15, perks: ['15% back in chips', 'Commission a piece from any Gesso artist', 'Your name on the Gesso founders wall', 'A seat at the annual collectors dinner'] }
  ];
  G.tierOf = (spent) => G.TIERS.filter((t) => spent >= t.at).pop();
  G.nextTier = (spent) => G.TIERS.find((t) => t.at > spent) || null;
  G.spent = () => G.wallet().spent || 0;
  G.DRIP_AT = 5000; G.DRIP_RATE = 0.01;
  G.myRate = () => G.tierOf(G.spent()).rate;

  /* ================= paying over time ================= */
  G.plans = (total) => {
    const p = [
      { id: 'full', name: 'Pay in full', today: total, n: 0, each: 0, note: 'Ships right away' },
      { id: 'pay4', name: 'Pay in 4', today: total / 4, n: 3, each: total / 4, every: 'every 2 weeks', note: 'Ships right away, 0% interest' },
      { id: 'layw', name: 'Layaway, weekly', today: total / 12, n: 11, each: total / 12, every: 'a week', note: '12 weekly payments, held for you, 0% interest' },
      { id: 'lay6', name: 'Layaway, 6 months', today: total / 6, n: 5, each: total / 6, every: 'a month', note: 'Held for you, ships after the last payment, 0% interest' }
    ];
    if (total >= 1000) p.push({ id: 'lay10', name: 'Layaway, 10 months', today: total / 10, n: 9, each: total / 10, every: 'a month', note: 'Held for you, ships after the last payment, 0% interest' });
    return p;
  };
  G.planLine = (pl) => (pl.n ? `${G.usd(pl.today, true)} today, then ${pl.n} × ${G.usd(pl.each, true)} ${pl.every}` : 'One payment');

  /* ================= live state (sample wallet, purchases made in this preview) ================= */
  const SAMPLE_WALLET = {
    sample: true,
    chips: { hamel: 9.12, june: 14.6, ruben: 4.8 },
    basis: { hamel: 43.15, june: 37.9, ruben: 7.1 },
    owned: ['hamel-06', 'june-01', 'june-04'],
    collectorNo: { hamel: 214, june: 61, ruben: 12 },
    spent: 3420,
    pending: {},
    log: [
      { t: '2026-10-02', text: "Backed HAMEL's wall project with $500 (example)", chips: 8.82, a: 'hamel' },
      { t: '2026-09-28', text: 'Collected Night Garden, Pink Plate', chips: 5.2, a: 'june' },
      { t: '2026-08-14', text: 'Collected Untitled (Ribbons), print 12/40', chips: 9.12, a: 'hamel' },
      { t: '2026-07-30', text: 'Founding collector #12 of Ruben Castillo', chips: 4.8, a: 'ruben' },
      { t: '2026-06-02', text: 'Collected Ghost Fern, 31/60', chips: 9.4, a: 'june' }
    ]
  };
  G.wallet = () => {
    const w = store.get('wallet', null) || JSON.parse(JSON.stringify(SAMPLE_WALLET));
    // collections saved before milestones existed: count what was bought
    if (w.spent == null) w.spent = (w.owned || []).reduce((s, id) => s + ((G.work(id) || {}).price || 0), 0);
    w.pending = w.pending || {}; w.basis = w.basis || {}; w.collectorNo = w.collectorNo || {}; w.log = w.log || []; w.owned = w.owned || [];
    return w;
  };
  G.saveWallet = (w) => store.set('wallet', w);
  G.resetPreview = () => { ['wallet', 'delta', 'sold', 'bag', 'follows', 'pledged', 'plan', 'introDone', 'walls'].forEach(store.del); };

  G.collectors = (slug) => (G.artist(slug).collectors + ((store.get('delta', {}) || {})[slug] || 0));
  G.addCollector = (slug) => { const d = store.get('delta', {}) || {}; d[slug] = (d[slug] || 0) + 1; store.set('delta', d); };
  G.priceOf = (slug) => G.price(G.collectors(slug));
  G.isSold = (w) => w.sold || (store.get('sold', []) || []).includes(w.id);
  G.markSold = (id) => { const s = store.get('sold', []) || []; if (!s.includes(id)) s.push(id); store.set('sold', s); };
  G.walletValue = (w) => Object.entries((w || G.wallet()).chips).reduce((s, [k, v]) => s + v * G.priceOf(k), 0);

  /* the bag holds artworks ("hamel-02") and objects ("p:hamel-apron|One size|2") */
  G.item = (key) => {
    if (typeof key !== 'string') return null;
    if (key.startsWith('p:')) {
      const [id, opt, qty] = key.slice(2).split('|'), p = G.product(id);
      if (!p) return null;
      const q = Math.max(1, +qty || 1);
      const parts = opt.split(' · ');
      let unit = G.optPrice(p, parts[0]);
      if (p.type === 'print' && G.FRAMES[parts[1]]) { const m = parts[0].match(/(\d+) × (\d+)/); unit += G.framePrice({ w: +m[1], h: +m[2] }, parts[1]); }
      return { key, kind: 'product', id, artist: p.artist, title: p.name, sub: `${p.type === 'print' ? opt.replace(/ · (\w+)$/, (m, k) => ' · ' + (G.FRAMES[k] ? G.FRAMES[k].name.toLowerCase() + ' frame' : k)) : opt}${q > 1 ? ' · ' + q + ' ' + (p.unit ? p.unit + 's' : 'pieces') : ''}`, opt, qty: q, unit, price: unit * q, href: `product.html#${id}`, p };
    }
    const [wid, frame] = key.split('|'), w = G.work(wid);
    if (!w || G.isSold(w)) return null;
    const fp = G.framePrice(w, frame);
    return { key, kind: 'work', id: wid, artist: w.artist, title: `${w.title}, ${w.year}`, sub: `${w.medium} · ${G.size(w)}${fp ? ' · framed, ' + G.FRAMES[frame].name.toLowerCase() : ''}`, qty: 1, unit: w.price + fp, price: w.price + fp, frame, href: `piece.html#${wid}`, w };
  };
  G.bag = () => (store.get('bag', []) || []).filter((k) => G.item(k));
  G.setBag = (b) => { store.set('bag', b); G.refreshBadges(); };
  G.addToBag = (key) => {
    let b = G.bag();
    if (key.startsWith('p:')) { const base = key.split('|').slice(0, 2).join('|'); b = b.filter((k) => !k.startsWith(base + '|')); }
    if (!key.startsWith('p:')) b = b.filter((k) => k.split('|')[0] !== key.split('|')[0]);
    if (!b.includes(key)) b.push(key);
    G.setBag(b);
    const it = G.item(key);
    G.toast(`<span>Added <b>${esc(it.title)}</b> to your bag</span><a href="checkout.html">Check out</a>`);
  };

  /* collector-count history for charts: 120 daily points ending today, monotonic */
  G.history = (slug, days = 120) => {
    const a = G.artist(slug), r = rng(hash('hist' + slug)), now = G.collectors(slug);
    const start = Math.max(0, Math.round(a.collectors * (0.32 + r() * 0.2)));
    const pts = []; let acc = 0; const steps = [];
    for (let i = 0; i < days; i++) { const s = Math.pow(r(), 2.2) * (1 + Math.sin(i / 9 + r()) * 0.6); steps.push(s); acc += s; }
    let n = start; const span = a.collectors - start;
    for (let i = 0; i < days; i++) { n += (steps[i] / acc) * span; pts.push(Math.round(n)); }
    pts[pts.length - 1] = now;
    return pts;
  };
  G.change = (slug, back = 30) => { const h = G.history(slug); const a = G.price(h[h.length - 1 - back]), b = G.price(h[h.length - 1]); return (b - a) / a; };

  /* ================= formatting ================= */
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  G.esc = esc;
  G.usd = (x, cents) => {
    const c = cents === undefined ? Math.round(x) !== x || x < 100 : cents;
    return '$' + x.toLocaleString('en-US', { minimumFractionDigits: c ? 2 : 0, maximumFractionDigits: c ? 2 : 0 });
  };
  G.chips = (x) => x.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  G.pct = (x) => (x >= 0 ? '+' : '−') + Math.abs(x * 100).toFixed(1) + '%';
  const r1 = (x) => String(Math.round(x * 10) / 10);
  G.dims = (w) => (w.cm ? `${w.cm[0]} × ${w.cm[1]} cm · ${r1(w.w)} × ${r1(w.h)} in` : `${w.w} × ${w.h} in · ${r1(w.w * 2.54)} × ${r1(w.h * 2.54)} cm`);
  G.size = (w) => (w.cm ? `${w.cm[0]} × ${w.cm[1]} cm` : `${w.w} × ${w.h} in`);
  G.ordinal = (n) => { const s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); };

  /* sparkline as an SVG string, scaled to its own min/max, endpoint emphasized */
  G.spark = (vals, { w = 160, h = 34, stroke = 'currentColor', fill = true } = {}) => {
    const min = Math.min(...vals), max = Math.max(...vals), span = max - min || 1, pad = 3;
    const pts = vals.map((v, i) => [(i / (vals.length - 1)) * (w - pad * 2) + pad, h - pad - ((v - min) / span) * (h - pad * 2)]);
    const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
    const last = pts[pts.length - 1];
    const id = 'sg' + Math.random().toString(36).slice(2, 8);
    return `<svg class="spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true">
      ${fill ? `<defs><linearGradient id="${id}" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="${stroke}" stop-opacity=".22"/><stop offset="1" stop-color="${stroke}" stop-opacity="0"/></linearGradient></defs>
      <path d="${d} L ${last[0].toFixed(1)} ${h} L ${pts[0][0].toFixed(1)} ${h} Z" fill="url(#${id})"/>` : ''}
      <path d="${d}" fill="none" stroke="${stroke}" stroke-width="1.6" vector-effect="non-scaling-stroke" stroke-linejoin="round"/>
      <circle cx="${last[0]}" cy="${last[1]}" r="2.6" fill="${stroke}"/></svg>`;
  };

  /* paint-chip card markup */
  G.chipCard = (slug, opts = {}) => {
    const a = G.artist(slug), n = G.collectors(slug), p = G.price(n), ch = G.change(slug);
    const hist = G.history(slug).slice(-60).map(G.price);
    const seats = Math.max(0, G.FOUNDING - n);
    const tag = opts.tag || 'a';
    return `<${tag} class="chip" ${tag === 'a' ? `href="artist.html#${slug}"` : ''} style="--c:${a.color};--on:${a.on}" data-chip="${slug}">
      <div class="swatch"><span class="notch"></span>
        <div class="tick">$${a.ticker}</div>
        <div class="row"><span>${esc(a.name)}</span>${seats ? `<span class="seats" title="Founding collectors earn 2× chips">${seats} founding left</span>` : ''}</div>
      </div>
      <div class="strip">
        <div class="px" title="Price per chip, and its change over 30 days"><span class="usd" data-px>${G.usd(p, true)}</span><span class="chg ${ch >= 0 ? 'up' : 'down'}">${G.pct(ch)}</span></div>
        <div style="color:var(--up)">${G.spark(hist)}</div>
        <div class="meta" data-n>${n.toLocaleString()} collectors</div>
      </div></${tag}>`;
  };

  /* artwork card with a wall label */
  G.workCard = (w, opts = {}) => {
    const a = G.artist(w.artist), sold = G.isSold(w), n = G.collectors(w.artist);
    const earn = G.chipsFor(w.price, n);
    return `<a class="work" href="piece.html#${w.id}">
      <div class="frame">${G.artImg(w, opts.size || 520, 'art hung')}
        ${sold ? '<span class="red-dot" title="Collected"></span>' : `<button class="quick-add" type="button" data-add="${w.id}">+ Add to bag</button>`}
      </div>
      <div class="walllabel">
        <span class="who"><i class="dot" style="--c:${a.color}"></i>${esc(a.name)}</span>
        <span class="title"><b>${esc(w.title)}</b>, ${w.year}</span>
        <span class="meta">${esc(w.medium)} · ${G.size(w)}${w.edition !== 'Original' ? ' · ' + esc(w.edition) : ''}</span>
        <span class="price">${sold ? '<span class="sold-tag">Collected</span>' : `<span class="usd">${G.usd(w.price)}</span>`}
          <span class="earn" ${sold ? '' : `title="${G.chips(earn)} $${a.ticker} chips at today's price"`}>${sold ? `by collector #${w.by || n}` : `${G.usd(Math.round(earn * G.price(n)))} back in chips`}</span></span>
      </div></a>`;
  };

  /* ================= generative stand-in artwork =================
     Each artist's pieces are drawn on a canvas from a seed so the preview has real-feeling art.
     Swap in photographs later by giving a work an `img` URL. */
  function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  G.rng = rng; G.hash = hash;
  const pick = (r, arr) => arr[Math.floor(r() * arr.length)];
  const blobP = (r, wob = 1) => ({
    a1: (0.06 + r() * 0.16) * wob, k1: 2 + Math.floor(r() * 3), p1: r() * 6.283,
    a2: r() * 0.08 * wob, k2: 3 + Math.floor(r() * 4), p2: r() * 6.283,
    a3: r() * 0.035 * wob, k3: 6 + Math.floor(r() * 5), p3: r() * 6.283,
    sx: 0.72 + r() * 0.56, sy: 0.72 + r() * 0.56, rot: r() * 6.283
  });
  function blob(ctx, cx, cy, rad, P, k) {
    ctx.beginPath();
    const N = 84, c = Math.cos(P.rot), s = Math.sin(P.rot);
    for (let i = 0; i <= N; i++) {
      const t = (i / N) * Math.PI * 2;
      const rr = rad * k * (1 + P.a1 * Math.sin(P.k1 * t + P.p1) + P.a2 * Math.sin(P.k2 * t + P.p2) + P.a3 * Math.sin(P.k3 * t + P.p3));
      const x = Math.cos(t) * rr * P.sx, y = Math.sin(t) * rr * P.sy;
      const X = cx + x * c - y * s, Y = cy + x * s + y * c;
      i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y);
    }
    ctx.closePath();
  }
  function grain(ctx, w, h, amt, r) {
    const img = ctx.getImageData(0, 0, w, h), d = img.data;
    for (let i = 0; i < d.length; i += 4) { const g = (r() - 0.5) * amt; d[i] += g; d[i + 1] += g; d[i + 2] += g; }
    ctx.putImageData(img, 0, 0);
  }
  function eye(ctx, x, y, s, rot, iris, lw, ink) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    ctx.beginPath(); ctx.moveTo(-s, 0); ctx.quadraticCurveTo(0, -s * 0.95, s, 0); ctx.quadraticCurveTo(0, s * 0.95, -s, 0); ctx.closePath();
    ctx.fillStyle = '#FFFDF6'; ctx.fill(); ctx.lineWidth = lw; ctx.strokeStyle = ink; ctx.stroke();
    ctx.save(); ctx.clip();
    ctx.beginPath(); ctx.arc(0, 0, s * 0.42, 0, 7); ctx.fillStyle = iris; ctx.fill(); ctx.lineWidth = lw * 0.8; ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, s * 0.18, 0, 7); ctx.fillStyle = ink; ctx.fill();
    ctx.restore();
    ctx.beginPath(); ctx.arc(-s * 0.1, -s * 0.12, s * 0.07, 0, 7); ctx.fillStyle = '#fff'; ctx.fill();
    ctx.restore();
  }

  const PAL = {
    hamel: ['#FF2E88', '#FFD400', '#00A8FF', '#18C964', '#FF6A00', '#7B3BFF', '#00D1BE', '#FF3B30', '#FFF6E0', '#C6F000'],
    gray: ['#F4F4F2', '#D9D9D6', '#B4B4B0', '#8A8A86', '#5E5E5B', '#3A3A38', '#FFFFFF'],
    ama: ['#1B2A6B', '#E9B12E', '#C2352B', '#2A7F62', '#16151B', '#2140E3', '#F0E3C8'],
    riso: ['#FF48B0', '#00A99D', '#FFE800', '#0078BF', '#FF6C2F'],
    topo: [['#183A2D', '#E9D9AE'], ['#E7D3A8', '#7A3B1E'], ['#B9532F', '#F6E6C8'], ['#22394F', '#D7E6E4'], ['#EADFCB', '#16865A']],
    field: [['#E8B23A', '#B5401F', '#6E1E14'], ['#1F3557', '#C9772B', '#E9D6A8'], ['#7C1F2A', '#E06A3A', '#F0C27A'], ['#2E4A3A', '#D7C38C', '#A4472C']],
    photo: [['#0E1838', '#5B3A79', '#E1708A', '#FFC07A'], ['#0B2440', '#2E6E9E', '#8FC3D9', '#F7E4B5'], ['#1A1030', '#7A2E5C', '#F2621E', '#FFD58A'], ['#14222E', '#3C5A73', '#D99E7C', '#FFE6C4']]
  };

  const PAINTERS = {
    hamel(ctx, w, h, r, opt) {
      const pal = opt.variant === 'gray' ? PAL.gray : PAL.hamel, ink = '#121116', S = Math.min(w, h), lw = S * 0.0105;
      ctx.fillStyle = pick(r, pal); ctx.fillRect(0, 0, w, h);
      const n = Math.round(30 * (w * h) / (S * S) ** 1 * 0.8 + 10);
      for (let i = 0; i < n; i++) {
        const cx = r() * w * 1.1 - w * 0.05, cy = r() * h * 1.1 - h * 0.05;
        const rad = S * (0.1 + r() * 0.2) * (1 - (i / n) * 0.45);
        const P = blobP(r, 1.3), bands = 2 + Math.floor(r() * 4);
        for (let j = 0; j <= bands; j++) {
          const k = 1 - j * (0.82 / (bands + 1));
          blob(ctx, cx, cy, rad, P, k);
          ctx.fillStyle = pick(r, pal); ctx.fill();
          ctx.lineWidth = j === 0 ? lw * 1.5 : lw * (0.55 + r() * 0.5); ctx.strokeStyle = ink; ctx.stroke();
        }
        if (r() < 0.38) eye(ctx, cx, cy, rad * (0.28 + r() * 0.14), (r() - 0.5) * 0.8, pick(r, pal), lw * 0.9, ink);
        else if (r() < 0.4) {
          ctx.beginPath(); for (let d = 0; d < 7; d++) { const a = r() * 6.28, rr = rad * 0.35 * r(); ctx.moveTo(cx + Math.cos(a) * rr + lw * 0.6, cy + Math.sin(a) * rr); ctx.arc(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, lw * 0.6, 0, 7); }
          ctx.fillStyle = ink; ctx.fill();
        }
      }
      // marker scribbles and zig-zags
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      for (let i = 0; i < 9; i++) {
        let x = r() * w, y = r() * h; const len = 4 + Math.floor(r() * 7), st = S * 0.025;
        ctx.beginPath(); ctx.moveTo(x, y);
        for (let k = 0; k < len; k++) { x += st; y += (k % 2 ? -1 : 1) * st * 0.9; ctx.lineTo(x, y); }
        ctx.strokeStyle = r() < 0.5 ? ink : '#FFFDF6'; ctx.lineWidth = lw * 0.8; ctx.stroke();
      }
      // drips
      for (let i = 0; i < 6; i++) {
        const x = r() * w, y = r() * h * 0.7, L = S * (0.05 + r() * 0.14), c = pick(r, pal);
        ctx.strokeStyle = c; ctx.lineWidth = lw * 1.1; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + L); ctx.stroke();
        ctx.beginPath(); ctx.arc(x, y + L, lw * 0.95, 0, 7); ctx.fillStyle = c; ctx.fill();
      }
      grain(ctx, w, h, 14, r);
    },
    mono(ctx, w, h, r) {
      const S = Math.min(w, h), ink = '#141318';
      ctx.fillStyle = '#F3F1EA'; ctx.fillRect(0, 0, w, h);
      const n = 6 + Math.floor(r() * 4);
      for (let i = 0; i < n; i++) {
        const cx = r() * w, cy = r() * h, rad = S * (0.28 + r() * 0.34), P = blobP(r, 1.6);
        blob(ctx, cx, cy, rad, P, 1); ctx.fillStyle = '#F3F1EA'; ctx.fill();
        const rings = 14 + Math.floor(r() * 12);
        for (let j = 0; j < rings; j++) {
          blob(ctx, cx, cy, rad, P, 1 - j / rings);
          ctx.lineWidth = S * (r() < 0.22 ? 0.009 : 0.0035); ctx.strokeStyle = ink; ctx.stroke();
        }
        if (r() < 0.5) { blob(ctx, cx, cy, rad, P, 0.12); ctx.fillStyle = ink; ctx.fill(); }
      }
      grain(ctx, w, h, 18, r);
    },
    field(ctx, w, h, r) {
      const p = pick(r, PAL.field);
      ctx.fillStyle = p[0]; ctx.fillRect(0, 0, w, h);
      const m = Math.min(w, h) * 0.08, blocks = r() < 0.5 ? 2 : 3;
      let y = m * 1.1; const gap = m * 0.6, bh = (h - m * 2.2 - gap * (blocks - 1));
      const hs = Array.from({ length: blocks }, () => 0.6 + r()); const tot = hs.reduce((a, b) => a + b, 0);
      for (let i = 0; i < blocks; i++) {
        const hh = (bh * hs[i]) / tot, col = p[(i + 1) % p.length];
        for (let k = 14; k >= 0; k--) {
          ctx.globalAlpha = k === 0 ? 0.82 : 0.05; const e = k * m * 0.06;
          ctx.fillStyle = col; ctx.fillRect(m - e, y - e, w - m * 2 + e * 2, hh + e * 2);
        }
        y += hh + gap;
      }
      ctx.globalAlpha = 1; grain(ctx, w, h, 22, r);
    },
    bauhaus(ctx, w, h, r) {
      const pal = PAL.ama, cols = 3 + Math.floor(r() * 2), cell = w / cols, rows = Math.ceil(h / cell);
      for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
        const X = x * cell, Y = y * cell, bg = pick(r, pal); let fg = pick(r, pal); if (fg === bg) fg = pal[(pal.indexOf(bg) + 2) % pal.length];
        ctx.fillStyle = bg; ctx.fillRect(X, Y, cell + 1, cell + 1); ctx.fillStyle = fg;
        const t = Math.floor(r() * 6);
        ctx.beginPath();
        if (t === 0) { const cx = X + (r() < 0.5 ? 0 : cell), cy = Y + (r() < 0.5 ? 0 : cell); ctx.moveTo(cx, cy); ctx.arc(cx, cy, cell, 0, 7); ctx.save(); ctx.clip(); ctx.fillRect(X, Y, cell, cell); ctx.restore(); continue; }
        if (t === 1) { ctx.arc(X + cell / 2, Y + cell / 2, cell * 0.38, 0, 7); ctx.fill(); }
        if (t === 2) { ctx.arc(X + cell / 2, Y + cell, cell / 2, Math.PI, 0); ctx.fill(); }
        if (t === 3) { for (let i = 0; i < 5; i++) if (i % 2 === 0) ctx.rect(X, Y + (i * cell) / 5, cell, cell / 5); ctx.fill(); }
        if (t === 4) { ctx.moveTo(X, Y + cell); ctx.lineTo(X + cell / 2, Y); ctx.lineTo(X + cell, Y + cell); ctx.fill(); }
        if (t === 5) { for (let i = 3; i > 0; i--) { ctx.beginPath(); ctx.arc(X + cell / 2, Y + cell / 2, (cell * 0.45 * i) / 3, 0, 7); ctx.fillStyle = i % 2 ? fg : bg; ctx.fill(); } }
      }
      grain(ctx, w, h, 16, r);
    },
    riso(ctx, w, h, r) {
      const S = Math.min(w, h);
      ctx.fillStyle = '#F5F0E6'; ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'multiply';
      const inks = PAL.riso.slice().sort(() => r() - 0.5).slice(0, 2 + (r() < 0.4 ? 1 : 0));
      for (let i = 0; i < 6; i++) {
        const c = inks[i % inks.length], cx = w * (0.2 + r() * 0.6), cy = h * (0.15 + r() * 0.7), rad = S * (0.16 + r() * 0.22), P = blobP(r, 0.9);
        ctx.globalAlpha = 0.9; blob(ctx, cx, cy, rad, P, 1); ctx.fillStyle = c; ctx.fill();
        // leaf veins
        ctx.globalAlpha = 1; ctx.strokeStyle = '#F5F0E6'; ctx.lineWidth = S * 0.006; ctx.globalCompositeOperation = 'source-over';
        if (r() < 0.6) { ctx.beginPath(); ctx.moveTo(cx - rad * 0.7, cy + rad * 0.5); ctx.quadraticCurveTo(cx, cy, cx + rad * 0.6, cy - rad * 0.6); ctx.stroke(); }
        ctx.globalCompositeOperation = 'multiply';
      }
      // halftone sun
      const c = inks[0], hx = w * (0.15 + r() * 0.7), hy = h * (0.1 + r() * 0.3), hr = S * 0.22, step = S / 46;
      ctx.fillStyle = c; ctx.globalAlpha = 0.95;
      for (let y = hy - hr; y < hy + hr; y += step) for (let x = hx - hr; x < hx + hr; x += step) {
        const d = Math.hypot(x - hx, y - hy) / hr; if (d > 1) continue;
        ctx.beginPath(); ctx.arc(x, y, step * 0.48 * (1 - d * 0.8), 0, 7); ctx.fill();
      }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      grain(ctx, w, h, 26, r);
    },
    topo(ctx, w, h, r) {
      const [bg, ln] = pick(r, PAL.topo), S = Math.min(w, h);
      ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
      const n = 3 + Math.floor(r() * 3);
      for (let i = 0; i < n; i++) {
        const cx = r() * w, cy = r() * h, rad = S * (0.4 + r() * 0.5), P = blobP(r, 2), rings = 26 + Math.floor(r() * 14);
        blob(ctx, cx, cy, rad, P, 1); ctx.fillStyle = bg; ctx.fill();
        for (let j = 0; j < rings; j++) {
          blob(ctx, cx, cy, rad, P, 1 - j / rings);
          ctx.lineWidth = S * (j % 5 === 0 ? 0.0045 : 0.0018); ctx.strokeStyle = ln; ctx.globalAlpha = j % 5 === 0 ? 0.95 : 0.7; ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }
      grain(ctx, w, h, 18, r);
    },
    photo(ctx, w, h, r) {
      const p = pick(r, PAL.photo), hz = h * (0.52 + r() * 0.14);
      let g = ctx.createLinearGradient(0, 0, 0, hz);
      g.addColorStop(0, p[0]); g.addColorStop(0.45, p[1]); g.addColorStop(0.82, p[2]); g.addColorStop(1, p[3]);
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, hz);
      const sx = w * (0.25 + r() * 0.5), sy = hz - h * (0.02 + r() * 0.08), sr = Math.min(w, h) * 0.06;
      const glow = ctx.createRadialGradient(sx, sy, 0, sx, sy, sr * 7); glow.addColorStop(0, 'rgba(255,236,190,.85)'); glow.addColorStop(1, 'rgba(255,236,190,0)');
      ctx.fillStyle = glow; ctx.fillRect(0, 0, w, hz);
      ctx.beginPath(); ctx.arc(sx, sy, sr, 0, 7); ctx.fillStyle = '#FFF2D6'; ctx.fill();
      g = ctx.createLinearGradient(0, hz, 0, h); g.addColorStop(0, p[2]); g.addColorStop(0.3, p[1]); g.addColorStop(1, p[0]);
      ctx.fillStyle = g; ctx.fillRect(0, hz, w, h - hz);
      for (let y = hz; y < h; y += 2 + r() * 3) {
        const spread = (y - hz) / (h - hz), half = sr * (1.2 + spread * 4) * (0.5 + r());
        ctx.fillStyle = `rgba(255,236,200,${0.55 * (1 - spread)})`; ctx.fillRect(sx - half + (r() - 0.5) * sr, y, half * 2, 1.2);
      }
      ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(0, hz - 1, w, 1.5);
      grain(ctx, w, h, 30, r);
    }
  };

  const cache = new Map();
  G.renderArt = (key, style, w, h, opt = {}) => {
    const ck = key + '|' + w + 'x' + h;
    if (cache.has(ck)) return cache.get(ck);
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    PAINTERS[style](ctx, w, h, rng(hash(key)), opt);
    const url = c.toDataURL('image/jpeg', 0.86);
    cache.set(ck, url);
    return url;
  };
  G.workArt = (w, px = 520) => {
    // Justin's photos come in two sizes: small for cards, full for the artwork page
    if (w.img) return px <= 600 && /^art\/justin\/j/.test(w.img) ? w.img.replace('art/justin/', 'art/justin/t/') : w.img;
    const a = G.artist(w.artist), ar = w.w / w.h;
    const W = ar >= 1 ? px : Math.round(px * ar), H = ar >= 1 ? Math.round(px / ar) : px;
    return G.renderArt(w.id, a.style, W, H, { variant: w.variant });
  };
  /* placeholder <img> that hydrates after first paint; aspect-ratio reserves its space */
  G.artImg = (w, px = 520, cls = 'art', alt) =>
    `<img class="${cls}" data-art="${w.id}" data-px="${px}" style="--ar:${w.w}/${w.h}" width="${w.w * 10}" height="${w.h * 10}" alt="${esc(alt || `${w.title} by ${G.artist(w.artist).name}`)}" decoding="async">`;
  G.artistArt = (slug, key, w, h) => { const a = G.artist(slug); return (a.photos && a.photos[key]) || G.renderArt(slug + ':' + key, a.style, w, h); };
  G.hydrate = (root = document) => {
    root.querySelectorAll('img[data-prod]:not([src])').forEach((el) => G.renderProduct(G.product(el.dataset.prod), +el.dataset.px || 480).then((u) => (el.src = u)).catch(() => {}));
    root.querySelectorAll('img[data-map]:not([src])').forEach((el) => (el.src = G.mapTile(G.venues.find((v) => v.id === el.dataset.map))));
    const els = [...root.querySelectorAll('img[data-art]:not([src]), [data-artist-art]:not([data-done])')];
    let i = 0;
    const step = () => {
      const t0 = performance.now();
      while (i < els.length && performance.now() - t0 < 24) {
        const el = els[i++];
        if (el.dataset.art) el.src = G.workArt(G.work(el.dataset.art), +el.dataset.px || 520);
        else {
          const [slug, key, w, h] = el.dataset.artistArt.split(',');
          const url = G.artistArt(slug, key, +w, +h);
          if (el.tagName === 'IMG') el.src = url; else el.style.backgroundImage = `url(${url})`;
          el.dataset.done = '1';
        }
      }
      if (i < els.length) requestAnimationFrame(step);
    };
    step();
  };

  /* ================= object mockups: the artist's image printed onto real things ================= */
  const loadImg = (src) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
  G.loadImg = loadImg;
  const coverImg = (ctx, img, x, y, w, h) => { const r = Math.max(w / img.width, h / img.height), iw = img.width * r, ih = img.height * r; ctx.drawImage(img, x + (w - iw) / 2, y + (h - ih) / 2, iw, ih); };
  // half-drop repeat, the way wallpaper is printed
  G.tileImg = (ctx, img, x, y, w, h, t) => {
    const th = t * img.height / img.width;
    for (let col = 0, xx = x; xx < x + w; xx += t, col++) for (let yy = y - (col % 2 ? th / 2 : 0); yy < y + h; yy += th) ctx.drawImage(img, xx, yy, t, th);
  };
  const MOCK = {
    backdrop(ctx, S) {
      const g = ctx.createLinearGradient(0, 0, 0, S); g.addColorStop(0, '#F0EFEA'); g.addColorStop(1, '#D9D7CF');
      ctx.fillStyle = g; ctx.fillRect(0, 0, S, S);
    },
    shadow(ctx, S, cx, cy, rx, ry) {
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rx); g.addColorStop(0, 'rgba(0,0,0,.28)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.save(); ctx.translate(cx, cy); ctx.scale(1, ry / rx); ctx.translate(-cx, -cy); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, rx, 0, 7); ctx.fill(); ctx.restore();
    },
    shade(ctx, x0, y0, x1, y1, stops) { const g = ctx.createLinearGradient(x0, y0, x1, y1); stops.forEach(([o, c]) => g.addColorStop(o, c)); return g; },
    apron(ctx, S, img) {
      const u = S / 100; MOCK.backdrop(ctx, S); MOCK.shadow(ctx, S, 50 * u, 94 * u, 30 * u, 3 * u);
      ctx.lineCap = 'round'; ctx.strokeStyle = '#26252A'; ctx.lineWidth = 2.2 * u;
      ctx.beginPath(); ctx.moveTo(40 * u, 17 * u); ctx.bezierCurveTo(40 * u, 3 * u, 60 * u, 3 * u, 60 * u, 17 * u); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(28 * u, 41 * u); ctx.bezierCurveTo(18 * u, 46 * u, 14 * u, 58 * u, 19 * u, 72 * u); ctx.moveTo(72 * u, 41 * u); ctx.bezierCurveTo(82 * u, 46 * u, 86 * u, 58 * u, 81 * u, 72 * u); ctx.stroke();
      const body = new Path2D(); body.moveTo(38 * u, 16 * u); body.lineTo(62 * u, 16 * u); body.quadraticCurveTo(63 * u, 31 * u, 72 * u, 38 * u); body.lineTo(74 * u, 88 * u);
      body.quadraticCurveTo(74 * u, 93 * u, 69 * u, 93 * u); body.lineTo(31 * u, 93 * u); body.quadraticCurveTo(26 * u, 93 * u, 26 * u, 88 * u); body.lineTo(28 * u, 38 * u); body.quadraticCurveTo(37 * u, 31 * u, 38 * u, 16 * u); body.closePath();
      ctx.save(); ctx.clip(body); coverImg(ctx, img, 26 * u, 16 * u, 48 * u, 77 * u);
      ctx.fillStyle = MOCK.shade(ctx, 26 * u, 0, 74 * u, 0, [[0, 'rgba(0,0,0,.18)'], [0.3, 'rgba(255,255,255,.06)'], [0.7, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,.2)']]); ctx.fillRect(0, 0, S, S);
      ctx.fillStyle = 'rgba(0,0,0,.1)'; ctx.fillRect(35 * u, 58 * u, 30 * u, 15 * u);
      ctx.setLineDash([1.2 * u, 1 * u]); ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 0.45 * u; ctx.strokeRect(35.8 * u, 58.8 * u, 28.4 * u, 13.4 * u);
      ctx.beginPath(); ctx.moveTo(50 * u, 59 * u); ctx.lineTo(50 * u, 72 * u); ctx.stroke(); ctx.setLineDash([]);
      ctx.restore(); ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 0.5 * u; ctx.stroke(body);
    },
    tote(ctx, S, img) {
      const u = S / 100; MOCK.backdrop(ctx, S); MOCK.shadow(ctx, S, 50 * u, 92 * u, 30 * u, 3 * u);
      ctx.lineCap = 'round';
      [[32, 46], [54, 68]].forEach(([a, b]) => { ctx.strokeStyle = '#CFC4AB'; ctx.lineWidth = 3.4 * u; ctx.beginPath(); ctx.moveTo(a * u, 35 * u); ctx.bezierCurveTo(a * u, 9 * u, b * u, 9 * u, b * u, 35 * u); ctx.stroke(); ctx.strokeStyle = '#E6DDC8'; ctx.lineWidth = 2.4 * u; ctx.stroke(); });
      ctx.fillStyle = '#E8DFCA'; ctx.fillRect(24 * u, 33 * u, 52 * u, 57 * u);
      ctx.save(); ctx.beginPath(); ctx.rect(31 * u, 42 * u, 38 * u, 40 * u); ctx.clip(); coverImg(ctx, img, 31 * u, 42 * u, 38 * u, 40 * u); ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = '#EFE7D4'; ctx.fillRect(0, 0, S, S); ctx.restore();
      ctx.fillStyle = MOCK.shade(ctx, 24 * u, 0, 76 * u, 0, [[0, 'rgba(0,0,0,.14)'], [0.35, 'rgba(255,255,255,.05)'], [1, 'rgba(0,0,0,.16)']]); ctx.fillRect(24 * u, 33 * u, 52 * u, 57 * u);
      ctx.fillStyle = 'rgba(0,0,0,.08)'; ctx.fillRect(24 * u, 33 * u, 52 * u, 2.2 * u);
    },
    tee(ctx, S, img) {
      const u = S / 100; MOCK.backdrop(ctx, S); MOCK.shadow(ctx, S, 50 * u, 93 * u, 28 * u, 2.6 * u);
      const t = new Path2D(); t.moveTo(40 * u, 14 * u); t.lineTo(24 * u, 19 * u); t.lineTo(11 * u, 36 * u); t.lineTo(21 * u, 44 * u); t.lineTo(28 * u, 37 * u); t.lineTo(29 * u, 90 * u);
      t.lineTo(71 * u, 90 * u); t.lineTo(72 * u, 37 * u); t.lineTo(79 * u, 44 * u); t.lineTo(89 * u, 36 * u); t.lineTo(76 * u, 19 * u); t.lineTo(60 * u, 14 * u); t.quadraticCurveTo(50 * u, 23 * u, 40 * u, 14 * u); t.closePath();
      ctx.fillStyle = '#F4F3EF'; ctx.fill(t);
      ctx.save(); ctx.clip(t); coverImg(ctx, img, 36 * u, 29 * u, 28 * u, 32 * u);
      ctx.fillStyle = MOCK.shade(ctx, 11 * u, 0, 89 * u, 0, [[0, 'rgba(0,0,0,.12)'], [0.4, 'rgba(0,0,0,0)'], [0.62, 'rgba(0,0,0,.05)'], [1, 'rgba(0,0,0,.14)']]); ctx.fillRect(0, 0, S, S); ctx.restore();
      ctx.strokeStyle = 'rgba(0,0,0,.16)'; ctx.lineWidth = 0.5 * u; ctx.stroke(t);
      ctx.beginPath(); ctx.moveTo(41 * u, 15.5 * u); ctx.quadraticCurveTo(50 * u, 25 * u, 59 * u, 15.5 * u); ctx.lineWidth = 1.4 * u; ctx.strokeStyle = 'rgba(0,0,0,.12)'; ctx.stroke();
    },
    deck(ctx, S, img) {
      const u = S / 100; MOCK.backdrop(ctx, S); MOCK.shadow(ctx, S, 52 * u, 93 * u, 22 * u, 2.4 * u);
      ctx.save(); ctx.translate(50 * u, 49 * u); ctx.rotate(-0.24);
      const w = 25 * u, h = 84 * u, r = w / 2, d = new Path2D(); d.moveTo(-w / 2, -h / 2 + r); d.arc(0, -h / 2 + r, r, Math.PI, 0); d.lineTo(w / 2, h / 2 - r); d.arc(0, h / 2 - r, r, 0, Math.PI); d.closePath();
      ctx.shadowColor = 'rgba(0,0,0,.3)'; ctx.shadowBlur = 3 * u; ctx.shadowOffsetX = 1.2 * u; ctx.shadowOffsetY = 1.6 * u; ctx.fillStyle = '#C9A877'; ctx.fill(d); ctx.shadowColor = 'transparent';
      ctx.save(); ctx.clip(d); coverImg(ctx, img, -w / 2, -h / 2, w, h); ctx.fillStyle = MOCK.shade(ctx, -w / 2, 0, w / 2, 0, [[0, 'rgba(0,0,0,.18)'], [0.4, 'rgba(255,255,255,.12)'], [1, 'rgba(0,0,0,.22)']]); ctx.fillRect(-w, -h, w * 2, h * 2); ctx.restore();
      ctx.fillStyle = '#1C1B20';
      [-1, 1].forEach((e) => [[-3, -2], [3, -2], [-3, 2], [3, 2]].forEach(([x, y]) => { ctx.beginPath(); ctx.arc(x * u, (e * 29 + y) * u, 0.7 * u, 0, 7); ctx.fill(); }));
      ctx.strokeStyle = 'rgba(0,0,0,.4)'; ctx.lineWidth = 0.4 * u; ctx.stroke(d); ctx.restore();
    },
    pillow(ctx, S, img) {
      const u = S / 100; MOCK.backdrop(ctx, S); MOCK.shadow(ctx, S, 50 * u, 86 * u, 34 * u, 4 * u);
      const pl = new Path2D(); pl.moveTo(18 * u, 20 * u); pl.quadraticCurveTo(50 * u, 26 * u, 82 * u, 20 * u); pl.quadraticCurveTo(76 * u, 51 * u, 82 * u, 82 * u); pl.quadraticCurveTo(50 * u, 76 * u, 18 * u, 82 * u); pl.quadraticCurveTo(24 * u, 51 * u, 18 * u, 20 * u); pl.closePath();
      ctx.save(); ctx.clip(pl); coverImg(ctx, img, 18 * u, 20 * u, 64 * u, 62 * u);
      const g = ctx.createRadialGradient(46 * u, 46 * u, 4 * u, 50 * u, 51 * u, 42 * u); g.addColorStop(0, 'rgba(255,255,255,.14)'); g.addColorStop(0.6, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.34)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, S, S); ctx.restore();
      ctx.strokeStyle = 'rgba(0,0,0,.28)'; ctx.lineWidth = 0.5 * u; ctx.stroke(pl);
    },
    mug(ctx, S, img) {
      const u = S / 100; MOCK.backdrop(ctx, S); MOCK.shadow(ctx, S, 50 * u, 82 * u, 30 * u, 4 * u);
      ctx.lineCap = 'round'; ctx.strokeStyle = '#E9E8E3'; ctx.lineWidth = 5.5 * u; ctx.beginPath(); ctx.moveTo(64 * u, 38 * u); ctx.bezierCurveTo(82 * u, 37 * u, 82 * u, 68 * u, 64 * u, 66 * u); ctx.stroke();
      ctx.strokeStyle = 'rgba(0,0,0,.12)'; ctx.lineWidth = 0.6 * u; ctx.stroke();
      const b = new Path2D(); b.moveTo(28 * u, 27 * u); b.lineTo(28 * u, 78 * u); b.ellipse(47 * u, 78 * u, 19 * u, 4 * u, 0, Math.PI, 0, true); b.lineTo(66 * u, 27 * u); b.closePath();
      ctx.save(); ctx.clip(b); coverImg(ctx, img, 28 * u, 23 * u, 38 * u, 60 * u);
      ctx.fillStyle = MOCK.shade(ctx, 28 * u, 0, 66 * u, 0, [[0, 'rgba(0,0,0,.35)'], [0.3, 'rgba(255,255,255,.18)'], [0.45, 'rgba(255,255,255,0)'], [1, 'rgba(0,0,0,.4)']]); ctx.fillRect(0, 0, S, S); ctx.restore();
      ctx.fillStyle = '#F2F1ED'; ctx.beginPath(); ctx.ellipse(47 * u, 27 * u, 19 * u, 4 * u, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#CFCDC6'; ctx.beginPath(); ctx.ellipse(47 * u, 27.4 * u, 17.4 * u, 3.1 * u, 0, 0, 7); ctx.fill();
    },
    print(ctx, S, img) {
      const u = S / 100;
      ctx.fillStyle = '#EDECE7'; ctx.fillRect(0, 0, S, S);
      const g = ctx.createLinearGradient(0, 0, S, 0); g.addColorStop(0, 'rgba(255,255,255,.4)'); g.addColorStop(1, 'rgba(0,0,0,.06)'); ctx.fillStyle = g; ctx.fillRect(0, 0, S, S);
      const ar = img.width / img.height, h = 70 * u, w = Math.min(60 * u, h * ar), hh = w / ar, x = (S - w) / 2, y = (S - hh) / 2 - 2 * u, m = 6 * u, f = 1.6 * u;
      ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.3)'; ctx.shadowBlur = 3 * u; ctx.shadowOffsetX = 0.8 * u; ctx.shadowOffsetY = 1.4 * u;
      ctx.fillStyle = '#17161B'; ctx.fillRect(x - m - f, y - m - f, w + 2 * (m + f), hh + 2 * (m + f)); ctx.restore();
      ctx.fillStyle = '#FBFAF7'; ctx.fillRect(x - m, y - m, w + 2 * m, hh + 2 * m);
      ctx.drawImage(img, x, y, w, hh);
    },
    hoodie(ctx, S, img, o = {}) {
      // two views side by side: front and back
      const u = S / 100, base = o.base || '#E9E3D6', cord = o.cord || '#F4F1EA', front = o.front || 'logo';
      ctx.fillStyle = '#ECEBE6'; ctx.fillRect(0, 0, S, S);
      const draw = (cx, back) => {
        const k = 0.5, X = (v) => cx + (v - 50) * u * k * 1.85, Y = (v) => (12 + v * 0.8) * u;
        const body = new Path2D();
        body.moveTo(X(38), Y(10)); body.quadraticCurveTo(X(50), Y(back ? 4 : 2), X(62), Y(10)); body.lineTo(X(80), Y(18)); body.lineTo(X(96), Y(64)); body.lineTo(X(86), Y(68));
        body.lineTo(X(74), Y(38)); body.lineTo(X(74), Y(96)); body.lineTo(X(26), Y(96)); body.lineTo(X(26), Y(38)); body.lineTo(X(14), Y(68)); body.lineTo(X(4), Y(64)); body.lineTo(X(20), Y(18)); body.closePath();
        ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.18)'; ctx.shadowBlur = 2 * u; ctx.shadowOffsetY = 1 * u; ctx.fillStyle = base; ctx.fill(body); ctx.restore();
        ctx.save(); ctx.clip(body);
        const art = (im, x0, y0, x1, y1) => { if (!im) return; const w = (x1 - x0), h = (y1 - y0), r = Math.max(w / im.width, h / im.height); ctx.save(); ctx.beginPath(); ctx.rect(x0, y0, w, h); ctx.clip(); ctx.drawImage(im, x0 + (w - im.width * r) / 2, y0 + (h - im.height * r) / 2, im.width * r, im.height * r); ctx.restore(); };
        if (o.sleeves) { art(o.sleeves, X(4), Y(18), X(26), Y(70)); art(o.sleeves, X(74), Y(18), X(96), Y(70)); }
        if (back) art(o.back || img, X(30), Y(24), X(70), Y(74));
        else if (front === 'art') art(o.frontImg || img, X(40), Y(30), X(60), Y(50));
        const g = ctx.createLinearGradient(X(4), 0, X(96), 0); g.addColorStop(0, 'rgba(0,0,0,.12)'); g.addColorStop(0.5, 'rgba(255,255,255,.04)'); g.addColorStop(1, 'rgba(0,0,0,.14)'); ctx.fillStyle = g; ctx.fillRect(0, 0, S, S);
        ctx.fillStyle = 'rgba(0,0,0,.07)'; ctx.fillRect(X(26), Y(88), X(74) - X(26), Y(96) - Y(88));
        ctx.restore();
        ctx.strokeStyle = 'rgba(0,0,0,.18)'; ctx.lineWidth = 0.35 * u; ctx.stroke(body);
        // hood
        ctx.fillStyle = base; ctx.beginPath(); ctx.moveTo(X(38), Y(10)); ctx.quadraticCurveTo(X(50), Y(back ? -10 : -6), X(62), Y(10)); ctx.quadraticCurveTo(X(50), Y(back ? 14 : 18), X(38), Y(10)); ctx.fill();
        ctx.fillStyle = 'rgba(0,0,0,.12)'; ctx.fill();
        if (!back) {
          ctx.strokeStyle = cord; ctx.lineWidth = 0.7 * u; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(X(46), Y(14)); ctx.lineTo(X(45), Y(30)); ctx.moveTo(X(54), Y(14)); ctx.lineTo(X(55), Y(30)); ctx.stroke();
          ctx.fillStyle = 'rgba(0,0,0,.07)'; ctx.fillRect(X(34), Y(62), X(66) - X(34), Y(78) - Y(62));
          if (front === 'logo') {
            ctx.fillStyle = o.logoInk || '#16151B'; ctx.beginPath(); ctx.arc(X(50), Y(38), 4.6 * u * k * 1.85 / 1.85 * 1.4, 0, 7); ctx.fill();
            ctx.fillStyle = base; ctx.font = `${1.5 * u}px 'Permanent Marker', cursive`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('gesso', X(50), Y(38));
          }
        }
        ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.font = `500 ${2.3 * u}px 'DM Mono', monospace`; ctx.textAlign = 'center'; ctx.fillText(back ? 'BACK' : 'FRONT', cx, 96 * u);
      };
      draw(27 * u, false); draw(73 * u, true);
    },
    wallpaper(ctx, S, img) {
      const u = S / 100;
      G.tileImg(ctx, img, 0, 0, S, 79 * u, 24 * u);
      ctx.fillStyle = MOCK.shade(ctx, 0, 0, S, 0, [[0, 'rgba(255,255,255,.12)'], [1, 'rgba(0,0,0,.22)']]); ctx.fillRect(0, 0, S, 79 * u);
      ctx.fillStyle = '#F1F0EC'; ctx.fillRect(0, 79 * u, S, 3 * u);
      ctx.fillStyle = '#A97C52'; ctx.fillRect(0, 82 * u, S, 18 * u);
      ctx.strokeStyle = 'rgba(60,35,15,.35)'; ctx.lineWidth = 0.3 * u; for (let y = 85; y < 100; y += 3.6) { ctx.beginPath(); ctx.moveTo(0, y * u); ctx.lineTo(S, y * u); ctx.stroke(); }
      MOCK.shadow(ctx, S, 50 * u, 83 * u, 22 * u, 1.6 * u);
      ctx.fillStyle = '#1D1C21'; ctx.fillRect(33 * u, 60 * u, 34 * u, 2.2 * u); ctx.fillRect(35 * u, 62 * u, 1.5 * u, 21 * u); ctx.fillRect(63.5 * u, 62 * u, 1.5 * u, 21 * u);
      ctx.fillStyle = '#E9E6DE'; ctx.beginPath(); ctx.ellipse(44 * u, 55 * u, 3.4 * u, 5 * u, 0, 0, 7); ctx.fill();
      ctx.strokeStyle = '#3E6B45'; ctx.lineWidth = 0.6 * u; [[-6, -14], [0, -17], [5, -13]].forEach(([dx, dy]) => { ctx.beginPath(); ctx.moveTo(44 * u, 51 * u); ctx.quadraticCurveTo((44 + dx / 2) * u, (51 + dy / 2) * u, (44 + dx) * u, (51 + dy) * u); ctx.stroke(); });
    }
  };
  const mockCache = new Map();
  G.renderProduct = async (p, px = 600) => {
    const k = p.id + '|' + px; if (mockCache.has(k)) return mockCache.get(k);
    const job = (async () => {
      const img = await loadImg(G.workArt(G.work(p.src), 900));
      const c = document.createElement('canvas'); c.width = c.height = px;
      MOCK[p.type](c.getContext('2d'), px, img);
      return c.toDataURL('image/jpeg', 0.88);
    })();
    mockCache.set(k, job); return job;
  };
  G.renderHoodie = async (o, px = 900) => {
    const load = async (id) => (id ? loadImg(G.workArt(G.work(id), 700)) : null);
    const [front, back, sleeves] = await Promise.all([load(o.front === 'art' ? o.frontArt : null), load(o.backArt), load(o.sleeveArt)]);
    const c = document.createElement('canvas'); c.width = c.height = px;
    MOCK.hoodie(c.getContext('2d'), px, back, { base: o.base, cord: o.cord, front: o.front, frontImg: front, back, sleeves, logoInk: o.logoInk });
    return c.toDataURL('image/jpeg', 0.88);
  };
  G.productImg = (p, px = 480, cls = 'art') => `<img class="${cls}" data-prod="${p.id}" data-px="${px}" style="--ar:1" width="600" height="600" alt="${esc(p.name)} printed with ${esc(G.work(p.src).title)} by ${esc(G.artist(p.artist).name)}" decoding="async">`;

  /* ================= map tiles for venues, drawn in the page's own colors ================= */
  const css = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  G.mapTile = (v, w = 640, h = 360) => {
    const r = rng(hash('map' + v.id)), c = document.createElement('canvas'); c.width = w; c.height = h; const ctx = c.getContext('2d');
    ctx.fillStyle = css('--wall-2'); ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(40,150,90,.2)'; ctx.beginPath(); ctx.roundRect(r() * w * 0.6, r() * h * 0.6, w * (0.15 + r() * 0.15), h * (0.2 + r() * 0.2), 10); ctx.fill();
    if (r() < 0.7) { ctx.strokeStyle = 'rgba(70,130,200,.32)'; ctx.lineWidth = 18 + r() * 14; ctx.beginPath(); ctx.moveTo(-20, h * r()); ctx.bezierCurveTo(w * 0.3, h * r(), w * 0.6, h * r(), w + 20, h * r()); ctx.stroke(); }
    const roads = [];
    for (let i = 0; i < 9; i++) { const x = (i + r() * 0.6) * (w / 8), sk = (r() - 0.5) * 60; roads.push([[x, -10], [x + sk, h + 10], i % 4 === 1 ? 9 : 4]); }
    for (let i = 0; i < 6; i++) { const y = (i + r() * 0.6) * (h / 5), sk = (r() - 0.5) * 50; roads.push([[-10, y], [w + 10, y + sk], i === 2 ? 9 : 4]); }
    const diag = [[-10, h * r()], [w + 10, h * r()], 7]; roads.push(diag);
    ctx.lineCap = 'round';
    roads.forEach(([a, b, lw]) => { ctx.strokeStyle = css('--rule'); ctx.lineWidth = lw + 2.5; ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b); ctx.stroke(); });
    roads.forEach(([a, b, lw]) => { ctx.strokeStyle = css('--card'); ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b); ctx.stroke(); });
    const a = G.artist(v.artist), px = w / 2, py = h / 2 + 10;
    if (!v.tbd) {
      ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(px, py + 2, 9, 4, 0, 0, 7); ctx.fill();
      ctx.fillStyle = a.color; ctx.beginPath(); ctx.moveTo(px, py); ctx.bezierCurveTo(px - 16, py - 20, px - 15, py - 42, px, py - 42); ctx.bezierCurveTo(px + 15, py - 42, px + 16, py - 20, px, py); ctx.fill();
      ctx.lineWidth = 2.5; ctx.strokeStyle = '#fff'; ctx.stroke(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(px, py - 28, 5.5, 0, 7); ctx.fill();
    }
    return c.toDataURL('image/png');
  };

  G.venueCard = (v, showArtist) => {
    const a = G.artist(v.artist), dir = G.directions(v);
    const status = G.openToday(v) ? '<b class="vopen">Open today</b>' : v.soon ? `<b class="vsoon">${esc(v.soon)}</b>` : '';
    return `<article class="venue">
      <div class="vmap">${v.img ? `<img src="${v.img}" alt="${esc(v.name)}" loading="lazy">` : `<img data-map="${v.id}" alt="Map of ${esc(v.area)}">`}
        <span class="vtype">${esc(v.type)}</span>${v.tbd ? '<span class="vlock">Exact spot shared after you book</span>' : ''}</div>
      <div class="vbody">
        ${showArtist ? `<a class="who" href="artist.html#${a.slug}"><i class="dot" style="--c:${a.color}"></i>${esc(a.name)}</a>` : ''}
        <h3>${esc(v.name)}</h3>
        <p class="muted">${esc(v.area)}${v.city ? ', ' + esc(v.city) : ''}</p>
        <p class="vhours">${status}${status ? ' · ' : ''}${esc(v.hours)}</p>
        <div class="vact">${dir ? `<a class="btn small" href="${dir}" target="_blank" rel="noopener">Directions ↗</a>` : ''}${v.book ? `<button class="btn small primary" type="button" data-book="${v.id}">Book a visit</button>` : ''}${!dir && !v.book ? '<span class="muted" style="font-size:var(--t-s)">Collectors get the location in the app</span>' : ''}</div>
        ${v.tbd ? '<p class="vnote">Placeholder until HAMEL confirms details.</p>' : ''}
      </div></article>`;
  };

  G.projectImg = (p, px = 640) => (p.img ? `<img class="art" src="${p.img}" style="--ar:4/3" alt="${esc(p.title)}" loading="lazy">` : G.artImg(G.work(p.art), px, 'art').replace(/style="--ar:[^"]+"/, 'style="--ar:4/3"'));
  G.projectCard = (p) => {
    const a = G.artist(p.artist), raised = G.raised(p), pct = Math.min(100, (raised / p.goal) * 100);
    return `<a class="proj" href="project.html#${p.id}">
      <div class="pimg">${G.projectImg(p)}${p.example ? '<span class="vtype">Example</span>' : ''}</div>
      <div class="pbody"><span class="who"><i class="dot" style="--c:${a.color}"></i>${esc(a.name)}</span><h3>${esc(p.title)}</h3>
        <div class="progress" role="progressbar" aria-valuenow="${Math.round(pct)}" aria-valuemin="0" aria-valuemax="100"><i style="width:${pct}%;background:${a.color}"></i></div>
        <div class="pstats"><span><b>${G.usd(raised)}</b> of ${G.usd(p.goal)}</span><span>${p.backers + (G.pledged(p) ? 1 : 0)} backers · ${p.daysLeft} days left</span></div></div></a>`;
  };

  G.productCard = (p) => {
    const a = G.artist(p.artist), back = Math.round(p.price * G.EARN);
    return `<a class="work obj" href="product.html#${p.id}">
      <div class="frame">${G.productImg(p, 480, 'art')}<button class="quick-add" type="button" data-add="p:${p.id}|${esc(p.opts[0])}|1">+ Add to bag</button></div>
      <div class="walllabel">
        <span class="who"><i class="dot" style="--c:${a.color}"></i>${esc(a.name)}</span>
        <span class="title"><b>${esc(p.name)}</b></span>
        <span class="meta">Printed with ${esc(G.work(p.src).title)} · made to order</span>
        <span class="price"><span class="usd">${G.usd(p.price)}${p.unit ? ' / ' + p.unit : ''}</span><span class="earn">${G.usd(back)} back in chips</span></span>
      </div></a>`;
  };

  /* bottom sheet / dialog used for bookings, pledges and the room studio's extras */
  G.sheet = (html, opts = {}) => {
    let el = document.getElementById('sheet');
    if (!el) {
      document.body.insertAdjacentHTML('beforeend', '<div class="sheet-wrap" id="sheet" hidden><div class="sheet-scrim" data-close></div><div class="sheet" role="dialog" aria-modal="true"><button class="sheet-x" type="button" data-close aria-label="Close">×</button><div class="sheet-body"></div></div></div>');
      el = document.getElementById('sheet');
      el.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) G.closeSheet(); });
      document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !el.hidden) G.closeSheet(); });
    }
    el.querySelector('.sheet').style.maxWidth = opts.wide ? '760px' : '';
    el.querySelector('.sheet-body').innerHTML = html;
    el.hidden = false; document.body.style.overflow = 'hidden';
    setTimeout(() => (el.querySelector('.sheet-body [autofocus]') || el.querySelector('.sheet-x')).focus(), 30);
    return el.querySelector('.sheet-body');
  };
  G.closeSheet = () => { const el = document.getElementById('sheet'); if (el) { el.hidden = true; document.body.style.overflow = ''; } };

  /* studio-visit booking, offered on artist pages and the Visit page */
  G.book = (vid) => {
    const v = VENUES.find((x) => x.id === vid), a = G.artist(v.artist), tier = G.tierOf(G.spent());
    const days = Array.from({ length: 6 }, (_, i) => { const d = new Date(G.TODAY); d.setDate(d.getDate() + i + 2); return d; });
    const body = G.sheet(`<p class="eyebrow">Book a visit</p><h2 style="font-size:2rem;margin:8px 0 6px">${esc(v.name)}</h2>
      <p class="muted">${esc(a.name)} · ${esc(v.hours)}</p>
      <p style="margin:14px 0;font-size:var(--t-s)">${G.TIERS.indexOf(tier) >= 2 ? `Studio visits are a perk of your <b>${tier.name}</b> milestone.` : 'Studio visits open up at the Underpainting milestone ($1,000 spent). You can still request one.'}</p>
      <div class="field"><span class="lbl">Day</span><div class="slots" id="bk-days">${days.map((d, i) => `<button type="button" class="pill" aria-pressed="${i === 0}" data-v="${d.toDateString()}">${d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</button>`).join('')}</div></div>
      <div class="field" style="margin-top:14px"><span class="lbl">Time</span><div class="slots" id="bk-times">${['11:00', '13:00', '15:00', '17:00'].map((t, i) => `<button type="button" class="pill" aria-pressed="${i === 1}" data-v="${t}">${t}</button>`).join('')}</div></div>
      <div class="field" style="margin-top:14px"><label for="bk-n">Guests</label><select class="input" id="bk-n"><option>Just me</option><option>2 people</option><option>3 people</option><option>4 people</option></select></div>
      <button class="btn primary block" type="button" id="bk-go" style="margin-top:20px">Request visit</button>
      <p class="mono muted" style="font-size:var(--t-xs);margin-top:10px">Preview: no request is sent.</p>`);
    body.querySelectorAll('.slots').forEach((g) => g.addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; g.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); }));
    body.querySelector('#bk-go').addEventListener('click', () => {
      const d = body.querySelector('#bk-days [aria-pressed="true"]').textContent, t = body.querySelector('#bk-times [aria-pressed="true"]').textContent;
      body.innerHTML = `<p class="eyebrow">Requested</p><h2 style="font-size:2rem;margin:8px 0">See you ${esc(d)} at ${t}.</h2><p class="muted">In the live app, ${esc(a.name)} confirms within a day and you get the address then. Nothing was sent in this preview.</p><button class="btn block" type="button" data-close style="margin-top:20px">Done</button>`;
    });
  };

  /* ================= chrome: top bar, tab bar, footer, toast ================= */
  const I = {
    pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>',
    menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
    home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/></svg>',
    wall: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><rect x="3" y="3" width="8" height="10"/><rect x="13" y="3" width="8" height="6"/><rect x="13" y="11" width="8" height="10"/><rect x="3" y="15" width="8" height="6"/></svg>',
    chip: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><rect x="5" y="2.5" width="14" height="19" rx="1"/><path d="M5 14.5h14"/><circle cx="15.5" cy="6" r="1.2"/></svg>',
    coll: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><rect x="3" y="7" width="18" height="13" rx="1"/><path d="M7 7V4h10v3M3 12h18"/></svg>',
    bag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 8h14l-1 13H6z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg>',
    brush: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 4l6 6-8 8-6-6z"/><path d="M6 12c-2 0-3 2-3 4s-1 3-1 4c2 0 6 0 7-2 1-1 0-3-1-4"/></svg>'
  };
  G.icons = I;

  const AFFIRM = ['YOU ARE RIGHT ON TIME', 'DRINK WATER. MAKE ART.', 'YOUR TASTE IS GOOD', 'REST IS PART OF THE WORK', 'KEEP GOING', 'CALL SOMEONE YOU LOVE', 'BUY ART, NOT STUFF', 'SHOULDERS DOWN, EYES UP', 'CHAOS HERE, PEACE THERE', 'THE WALL IS LISTENING'];
  // the NASDAQ-style board with a heartbeat: every artist's chip, plus a few things worth hearing
  G.pulse = () => {
    const items = [];
    G.artists.forEach((a, i) => {
      const ch = G.change(a.slug);
      items.push(`<span class="q"><b>$${a.ticker}</b> ${G.price(G.collectors(a.slug)).toFixed(2)} <i class="${ch >= 0 ? 'u' : 'd'}">${ch >= 0 ? '▲' : '▼'}${Math.abs(ch * 100).toFixed(1)}%</i></span>`);
      items.push(`<span class="aff">✶ ${AFFIRM[i % AFFIRM.length]}</span>`);
    });
    const idx = G.artists.reduce((s, a) => s + G.change(a.slug), 0) / G.artists.length;
    const row = items.join('');
    return `<div class="pulse" role="marquee" aria-label="Gesso board: artist chip prices and affirmations">
      <a class="pulse-l" href="now.html#board"><svg class="ekg" viewBox="0 0 120 24" aria-hidden="true"><path d="M0 13 H34 L39 13 L43 4 L48 21 L53 8 L57 13 H82 L85 10 L88 13 H120"/></svg><span>GESSO</span><i class="u">▲${(idx * 100).toFixed(2)}%</i></a>
      <div class="pulse-v"><div class="pulse-t">${row}${row}</div></div></div>`;
  };
  G.logo = (cls = '') => `<span class="glogo ${cls}" aria-hidden="true"><span>gesso</span></span>`;

  G.chrome = (page) => {
    const nav = [['now.html', 'Now', 'now'], ['artists.html', 'Artists', 'artists'], ['discover.html', 'Shop', 'discover'], ['book.html', 'FAME', 'book'], ['partners.html', 'Partners', 'partners'], ['mission.html', 'Mission', 'mission']];
    const menu = [['now.html', 'Now on Gesso'], ['artists.html', 'Artists'], ['discover.html', 'Shop art'], ['discover.html#objects', 'Hoodies, wallpaper and more'], ['book.html', 'FAME: book chefs, DJs and more'], ['project.html', 'Back a project'], ['visit.html', 'See art in person'], ['partners.html', 'Partners and Gesso House'], ['mission.html', 'Mission and votes'], ['collection.html', 'Your collection and milestones'], ['how-it-works.html', 'How chips work'], ['for-artists.html', 'Sell on Gesso']];
    const top = document.getElementById('chrome-top');
    if (top) top.outerHTML = `${G.pulse()}
      <header class="topbar"><div class="wrap">
        <a class="logo-link" href="now.html" aria-label="Gesso home">${G.logo()}</a>
        <nav class="nav" aria-label="Main">${nav.map(([h, l, k]) => `<a href="${h}" ${k === page ? 'aria-current="page"' : ''}>${l}</a>`).join('')}</nav>
        <div class="tools">
          <a class="wallet-pill" href="collection.html" title="What your chips are worth. Tap to see your collection."><span class="stack" data-wallet-stack></span><span class="num" data-wallet-val></span><span class="label muted">in chips</span></a>
          <a class="icon-btn" href="checkout.html" aria-label="Bag">${I.bag}<span class="badge" data-bag-count></span></a>
          <button class="icon-btn menu-btn" type="button" aria-label="Menu" aria-expanded="false" id="menu-btn">${I.menu}</button>
        </div>
      </div></header>`;
    const bottom = document.getElementById('chrome-bottom');
    if (bottom) bottom.outerHTML = `
      <nav class="tabbar" aria-label="Tabs">
        <a href="now.html" ${page === 'now' ? 'aria-current="page"' : ''}>${I.home}Now</a>
        <a href="discover.html" ${page === 'discover' ? 'aria-current="page"' : ''}>${I.wall}Shop</a>
        <a href="artists.html" ${page === 'artists' ? 'aria-current="page"' : ''}>${I.brush}Artists</a>
        <a href="collection.html" ${page === 'collection' ? 'aria-current="page"' : ''}>${I.coll}Collection</a>
        <a href="checkout.html" ${page === 'checkout' ? 'aria-current="page"' : ''}>${I.bag}Bag<span class="badge" data-bag-count></span></a>
      </nav>
      <footer class="footer"><div class="wrap">
        <div class="brand">
          <a class="logo-link" href="now.html" aria-label="Gesso home">${G.logo('big')}</a>
          <p class="muted">An art market owned by the people who collect it. Buy the art, earn the artist's chips, spend them on more art.</p>
          <div class="theme-toggle" role="group" aria-label="Theme"><button type="button" data-theme-set="light">Light</button><button type="button" data-theme-set="dark">Dark</button></div>
        </div>
        <div><h4>Collect</h4><ul><li><a href="artists.html">Artists</a></li><li><a href="discover.html">Shop art</a></li><li><a href="discover.html#objects">Hoodies, wallpaper, more</a></li><li><a href="book.html">FAME bookings</a></li><li><a href="project.html">Back a project</a></li><li><a href="visit.html">See art in person</a></li></ul></div>
        <div><h4>Learn</h4><ul><li><a href="mission.html">Mission and votes</a></li><li><a href="partners.html">Partners</a></li><li><a href="how-it-works.html">How chips work</a></li><li><a href="how-it-works.html#milestones">Milestones</a></li><li><a href="how-it-works.html#pay">Paying over time</a></li><li><a href="how-it-works.html#faq">Questions</a></li><li><a href="index.html#intro">Replay the intro</a></li></ul></div>
        <div><h4>Create</h4><ul><li><a href="for-artists.html">Sell on Gesso</a></li><li><a href="for-artists.html#compare">Fees compared</a></li><li><a href="for-artists.html#apply">Apply</a></li></ul></div>
        <div class="fine"><span>Design preview. HAMEL's paintings and photos are real; titles and prices are placeholders. Other artists, FAME creators and partners are samples with generated art. No payments are taken.</span><button type="button" class="link" style="background:none;border:0;padding:0;cursor:pointer;font-size:inherit" data-reset>Reset preview</button></div>
      </div></footer>`;
    document.body.insertAdjacentHTML('beforeend', '<div class="toast" role="status" aria-live="polite" id="toast"></div>');
    document.querySelector('.topbar').insertAdjacentHTML('beforeend', `<nav class="menu" id="menu" hidden aria-label="All pages"><div class="wrap">${menu.map(([h, l]) => `<a href="${h}">${l}<span aria-hidden="true">→</span></a>`).join('')}</div></nav>`);
    const mb = document.getElementById('menu-btn'), mn = document.getElementById('menu');
    mb.addEventListener('click', () => { mn.hidden = !mn.hidden; mb.setAttribute('aria-expanded', String(!mn.hidden)); });
    if (!store.get('introDone', false) && !['how', 'checkout', 'splash'].includes(page)) {
      document.querySelector('.topbar').insertAdjacentHTML('afterend', `<div class="intro" id="intro"><div class="wrap">
        <p><b>New here?</b> Every piece you buy pays you back 10% in that artist's chips, and chips gain value as the artist gains collectors.</p>
        <a href="how-it-works.html">How it works →</a><button type="button" aria-label="Dismiss" id="intro-x">×</button></div></div>`);
      document.getElementById('intro-x').addEventListener('click', () => { store.set('introDone', true); document.getElementById('intro').remove(); });
    }

    // theme
    const applyTheme = (t) => {
      if (t === 'system') document.documentElement.removeAttribute('data-theme'); else document.documentElement.setAttribute('data-theme', t);
      document.querySelectorAll('[data-theme-set]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.themeSet === t)));
    };
    applyTheme(store.get('theme', 'light') === 'dark' ? 'dark' : 'light');
    document.addEventListener('click', (e) => {
      const t = e.target.closest('[data-theme-set]');
      if (t) { store.set('theme', t.dataset.themeSet); applyTheme(t.dataset.themeSet); }
      const add = e.target.closest('[data-add]');
      if (add) { e.preventDefault(); e.stopPropagation(); G.addToBag(add.dataset.add); }
      if (e.target.closest('[data-reset]')) { G.resetPreview(); location.reload(); }
      const bk = e.target.closest('[data-book]');
      if (bk) { e.preventDefault(); G.book(bk.dataset.book); }
    });
    G.refreshBadges();
  };

  G.refreshBadges = () => {
    const n = G.bag().length;
    document.querySelectorAll('[data-bag-count]').forEach((b) => (b.textContent = n ? n : ''));
    const w = G.wallet();
    document.querySelectorAll('[data-wallet-val]').forEach((el) => (el.textContent = G.usd(G.walletValue(w), true)));
    document.querySelectorAll('[data-wallet-stack]').forEach((el) => (el.innerHTML = Object.keys(w.chips).slice(0, 3).map((k) => `<i style="--c:${G.artist(k).color}"></i>`).join('')));
  };

  let toastT;
  G.toast = (html) => {
    const t = document.getElementById('toast'); if (!t) return;
    t.innerHTML = html; t.classList.add('show');
    clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 3600);
  };

  /* sample community activity for tickers */
  const FIRST = ['Priya', 'Marcus', 'Lena', 'Dante', 'Sol', 'Imani', 'Theo', 'Rosa', 'Kenji', 'Aisha', 'Wes', 'Noor', 'Calla', 'Rafa', 'Bea', 'Omar'];
  G.activity = (count = 16, seed = 'act') => {
    const r = rng(hash(seed)), out = [];
    for (let i = 0; i < count; i++) {
      const w = pick(r, WORKS.filter((x) => !x.sold)), a = G.artist(w.artist);
      const who = pick(r, FIRST) + ' ' + String.fromCharCode(65 + Math.floor(r() * 26)) + '.';
      const kind = r();
      out.push(kind < 0.6
        ? { a, text: `${who} collected ${w.title}`, delta: `$${a.ticker} +${(r() * 0.9 + 0.1).toFixed(1)}%` }
        : kind < 0.85
          ? { a, text: `${who} spent ${(r() * 30 + 4).toFixed(1)} chips on ${a.name}`, delta: `saved ${G.usd(Math.round(r() * 160 + 20))}` }
          : { a, text: `${who} became a founding collector`, delta: `$${a.ticker} 2× chips` });
    }
    return out;
  };
})();
