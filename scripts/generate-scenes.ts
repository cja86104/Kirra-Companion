/**
 * KIRRA SCENE GENERATOR
 * =====================
 * Generates photorealistic background scenes for chat using fal.ai
 * 
 * Usage:
 *   npx ts-node scripts/generate-scenes.ts romantic morning
 *   npx ts-node scripts/generate-scenes.ts romantic all
 *   npx ts-node scripts/generate-scenes.ts all all
 */

import * as fal from '@fal-ai/serverless-client';
import * as fs from 'fs';
import * as path from 'path';
import https from 'https';

// =============================================================================
// CONFIGURATION
// =============================================================================

function configure() {
  const key = process.env.FAL_KEY;
  
  if (!key) {
    console.error('❌ FAL_KEY not found in environment variables!');
    console.error('Add FAL_KEY=your_key_here to your .env.local file');
    process.exit(1);
  }
  
  fal.config({ credentials: key });
  console.log('✅ FAL.ai configured\n');
}

// =============================================================================
// SCENE PROMPTS
// =============================================================================

const SCENES = {
  romantic: {
    morning: `Photorealistic interior photography of a beautiful modern kitchen on a sunny morning, the feeling of making breakfast with someone you love. Warm golden morning light streams through large windows above the sink, creating god rays and lens flare.

A gorgeous kitchen with white marble countertops, warm wood cabinets, brass fixtures. On the counter: two coffee mugs steaming, a French press, fresh croissants on a cutting board, a bowl of fresh berries and fruit. A cast iron pan on the stove with eggs cooking. Orange juice in a glass pitcher catching the light.

The kitchen island has two bar stools pulled close together, suggesting intimacy. Fresh flowers in a simple vase - peonies or ranunculus. A phone playing music, maybe a recipe book open.

Details that make it feel lived-in and loved: a dishcloth casually draped, a half-cut avocado, two plates set out waiting. Herbs growing in small pots on the windowsill catching sunlight. The morning paper or tablet on the counter.

Through the windows, soft morning sky and maybe trees or a garden visible. The feeling of a slow weekend morning with nowhere to rush to.

The right side of the frame should have softer lighting for UI overlay space.

Atmosphere is domestic bliss, new love mixed with comfortable routine, the simple joy of morning rituals together. Color palette of warm whites, marble gray, honey wood, brass gold, soft greens from plants, pops of color from fresh food.

Shot on Hasselblad medium format camera, 45mm lens, f/4, beautiful natural window lighting. Architectural Digest style kitchen photography. 8K photorealistic, magazine editorial quality.`,

    day: `Photorealistic interior photography of a bright sunlit sunroom or enclosed balcony during a lazy afternoon. The feeling of spending a perfect day with someone you love, nowhere to be, just enjoying each other's company.

A cozy daybed or oversized loveseat with plush white and cream cushions and soft throw blankets, positioned to catch the afternoon sun. Pillows scattered invitingly. The seating faces large floor-to-ceiling windows or glass doors showing a beautiful view - maybe a garden, city rooftops, or trees.

Abundant natural light floods the space, creating a bright airy atmosphere. Sheer white curtains billow gently suggesting a warm breeze. Dappled sunlight and leaf shadows play across the floor and furniture.

A small side table holds: two glasses of iced tea or lemonade with condensation, a bowl of fresh fruit like strawberries and grapes, an open book face-down, sunglasses, a bluetooth speaker playing soft music.

The space has plants everywhere - hanging plants, potted palms, trailing vines. A woven jute rug on the floor. Maybe a hanging egg chair or papasan chair in the corner. Bohemian yet sophisticated vibes.

The right side of the frame should have softer lighting for UI overlay space, perhaps where a second seat or reading nook is.

Atmosphere is blissful, relaxed, golden - that perfect afternoon feeling when time stops and the world is just the two of you. Color palette of bright whites, warm creams, natural wood, lush greens from plants, honey gold sunlight.

Shot on Hasselblad medium format camera, 35mm lens, f/4, beautiful natural window lighting with lens flare. Architectural Digest meets bohemian lifestyle photography. 8K photorealistic, magazine editorial quality.`,

    evening: `Photorealistic interior photography of an intimate living room set up for a romantic evening at home. Golden sunset light through windows mixing with warm candlelight creates a magical atmosphere.

A cozy seating area with a plush velvet sofa in deep jewel tones - emerald or navy - covered with soft throw blankets and pillows. A low coffee table set for two with: a cheese and charcuterie board beautifully arranged, two wine glasses with red wine, lit candles in varying heights, small bowls of olives and nuts.

The room glows with warm light from multiple sources: pillar candles on the coffee table, string lights draped along a bookshelf, a floor lamp with warm Edison bulb, the orange and pink sunset visible through windows. The lighting is romantic and flattering.

A record player on a credenza with vinyl records visible, suggesting music playing. A fireplace with a gentle fire burning OR a TV mounted above showing a paused movie. Bookshelves with books and personal objects. Plants and art on the walls.

Through the windows, a beautiful sunset sky in oranges, pinks, and purples. City lights beginning to twinkle or a garden in golden hour glow.

The right side of the frame should be in softer, romantic shadow for UI overlay.

Atmosphere is intimate, romantic, intentional - someone put effort into creating this perfect evening. Color palette of warm sunset golds, deep jewel tones, candlelight amber, rich woods, touches of brass.

Shot on Sony A7IV camera, 35mm lens, f/2.0, cinematic romantic lighting. Editorial lifestyle photography with film-like color grade. 8K photorealistic, magazine quality.`,

    night: `Photorealistic interior photography of an intimate luxurious bedroom late at night. Soft warm lamplight creates pools of golden illumination while city lights sparkle through large windows creating beautiful bokeh.

A large comfortable bed with premium white linens and a plush duvet, pillows arranged invitingly. The bed is the focal point - soft, welcoming, intimate. A cashmere throw blanket in blush or cream draped across the foot. The sheets slightly rumpled suggesting comfort and intimacy.

Bedside lighting is warm and flattering - a designer lamp with dimmed warm light, perhaps a few candles on the nightstand. On the nightstand: two wine glasses (one with a little wine left), a book, a phone face-down, perhaps chocolate or strawberries on a small plate.

Large windows reveal a nighttime cityscape - twinkling lights of buildings, perhaps a glimpse of a bridge or skyline. The city lights create beautiful out-of-focus bokeh circles. The contrast between the warm interior sanctuary and the cool blue city night is striking and romantic.

The room is sophisticated and luxurious but not cold - soft textures everywhere. A velvet bench at the foot of the bed, quality curtains, art on the walls, perhaps a vase of roses. Warm wood floors with a plush area rug.

The right side of the frame in softer shadow, still warm and inviting.

Atmosphere is intimate, sensual, private - a sanctuary for two people at the end of the night. Color palette of warm amber lamplight, cream and white linens, cool blue from city lights, touches of blush and rose.

Shot on Sony A7S III camera, 35mm lens, f/1.4, beautiful low-light photography with creamy bokeh. Cinematic intimate style, luxury hotel editorial quality. 8K photorealistic.`,
  },

  friend: {
    morning: `Photorealistic interior photography of a cozy bright living room on a sunny morning. Cheerful natural light streams through large windows illuminating a comfortable, lived-in space that feels welcoming and fun.

A plush oversized sofa in soft gray with colorful throw pillows - mustard yellow, teal, coral. A cozy knit blanket tossed casually over one arm. The sofa looks perfect for lounging and long conversations.

A rustic wooden coffee table holds two steaming mugs of coffee, a french press, a laptop open to a playlist, some magazines, and a small potted plant. A half-eaten pastry on a plate.

The room has warm oak floors with a colorful patterned area rug, floating shelves with books and plants and quirky decor, string lights, framed photos and artwork covering the walls in an eclectic gallery style. A record player on a console, vinyl records visible.

Large windows with simple white curtains let in abundant natural light. Plants everywhere - hanging plants, floor plants, windowsill plants. The vibe is creative and personal.

Right side of frame has a comfortable reading nook or chair in softer light.

The atmosphere is friendly, warm, energetic - like walking into your best friend's apartment for Saturday morning coffee. Color palette of warm neutrals with pops of color - yellow, teal, coral, green from plants.

Lifestyle photography, shot on Fujifilm GFX, 32mm lens, f/4, bright natural lighting. Urban apartment aesthetic, editorial style. 8K photorealistic.`,

    day: `Photorealistic interior photography of a sunlit modern apartment living room during a relaxed afternoon. Bright indirect light creates an airy, optimistic atmosphere perfect for hanging out.

A comfortable L-shaped sectional sofa in light gray with lots of pillows. A large round ottoman that doubles as a table covered in books, a laptop, game controllers, snacks. Evidence of friendship and good times.

The space features a large TV mounted on the wall, a gaming console, bluetooth speakers. A bookshelf filled with books, board games, travel souvenirs, photos with friends. A world map with pins marking adventures.

Big windows show trees and blue sky outside. The floors are light hardwood with a modern geometric rug. A dining area visible in the background with a table set for casual lunch.

Plants, natural textures, personal items everywhere making it feel authentic and lived-in. Art prints and posters on the walls reflecting diverse interests.

Right portion of the frame is well-lit but provides clean negative space.

The mood is relaxed, happy, casual - perfect for an afternoon of hanging out doing nothing in particular. Color palette of light neutrals, sky blue, grass green, warm wood.

Editorial interior photography, bright and airy style, shot on Canon R5, 24mm lens, f/5.6. Modern urban living aesthetic. 8K photorealistic, magazine quality.`,

    evening: `Photorealistic interior photography of a cozy living room in warm evening light. Golden sunset glow mixes with warm interior lamps creating a social, inviting atmosphere for a night in with friends.

A large comfortable sectional sofa with friends-gathering vibes. Colorful cushions and throws. A big coffee table with pizza boxes, drinks, a board game in progress, scattered cards, snack bowls.

Warm string lights and table lamps create cozy ambient lighting. A TV showing a paused movie. Bluetooth speaker playing music. The room feels alive with the energy of a fun evening.

Shelves display books, games, plants, photos of good memories. Posters and art on the walls. A record player spinning vinyl. Everything feels personal and welcoming.

Windows show sunset colors and city lights beginning to twinkle. The room balances warm interior lighting with the colorful evening sky.

Right side of frame in softer ambient light.

The atmosphere is fun, social, warm - movie night, game night, just-hanging-out-night energy. Color palette of warm sunset tones, cozy amber, pops of fun colors from decor.

Lifestyle photography with cinematic warmth, shot on Sony A7IV, 35mm lens, f/2.8. Cozy urban apartment, editorial style. 8K photorealistic.`,

    night: `Photorealistic interior photography of a comfortable apartment living room at night. Warm ambient lighting from multiple sources creates an intimate, relaxed atmosphere for late-night conversations.

Deep comfortable couch with soft blankets and pillows. A coffee table with mugs of hot chocolate, a half-eaten dessert, notebooks and pens like people have been talking for hours.

Warm lamp light from multiple sources - a floor lamp, string lights, candles on shelves. The glow is soft and golden. A TV on low showing something in the background. Soft music playing vibe.

Through windows, city lights sparkle in beautiful bokeh. The contrast between warm interior and cool city night is beautiful. Rain drops on window optional for extra cozy factor.

The room is full of personality - books, art, plants, photos, collected objects from adventures. It feels like a place where real conversations happen.

Right portion of frame in darker shadow but warmly lit enough to feel inviting not scary.

The mood is deep conversation, late-night talks, the special feeling of friendship after midnight. Color palette of warm amber, soft gold, cool blue from windows, deep comfortable shadows.

Low light interior photography, shot on Sony A7S III, 35mm lens, f/1.8, beautiful bokeh. Intimate and cozy, editorial style. 8K photorealistic.`,
  },

  mentor: {
    morning: `Photorealistic interior photography of a sophisticated home office or study in bright morning light. Professional yet warm atmosphere perfect for focused work and meaningful conversation.

A beautiful wooden desk near large windows, morning light illuminating the workspace. On the desk: an open laptop, a leather notebook with quality pen, a cup of coffee, organized papers, a small plant. Everything intentional and purposeful.

Behind the desk, floor-to-ceiling bookshelves filled with books - business, philosophy, literature, personal development. The books look read, not decorative. Some awards and meaningful objects interspersed.

A comfortable leather armchair for conversation sits across from the desk with a small side table. The seating arrangement suggests mentorship and dialogue.

The room has warm wood paneling or shelving, a quality area rug, perhaps a globe or art piece. Diplomas and meaningful photographs on walls. Plants adding life.

Right side of frame shows the conversation seating area in good light.

The atmosphere is inspiring, accomplished, welcoming - like walking into the office of someone you deeply respect who genuinely wants to help you grow. Color palette of rich wood tones, leather brown, deep green, cream, brass accents.

Professional interior photography, shot on Hasselblad, 50mm lens, f/4. Executive home office aesthetic, architectural digest style. 8K photorealistic.`,

    day: `Photorealistic interior photography of an elegant bright study during the productive afternoon. Abundant natural light creates an energized atmosphere for learning and growth.

A large wooden desk with beautiful grain, positioned to catch natural light. Clean and organized with quality items - a modern monitor, leather desk accessories, intellectual books stacked neatly, a notepad with handwritten notes, quality coffee in a ceramic mug.

Built-in bookshelves line the walls, filled with an impressive collection of books across topics. Intellectual curiosity evident. Some personal photos, awards, mementos from a successful career tastefully displayed.

Comfortable seating area with two leather chairs facing each other over a small table - perfect for one-on-one discussions. A chess set mid-game suggests strategic thinking.

Large windows with sophisticated curtains frame views of trees or city. A quality area rug, brass desk lamp, perhaps a telescope or globe suggesting curiosity about the world.

Right portion provides good space with softer but clear lighting.

The mood is focused, inspiring, aspirational - the office of someone who has achieved much and loves sharing wisdom. Color palette of warm wood, burgundy leather, navy blue, brass, cream.

Editorial interior photography, shot on Phase One, 55mm lens, f/5.6. Sophisticated traditional-modern blend. 8K photorealistic, magazine quality.`,

    evening: `Photorealistic interior photography of a distinguished study in warm evening light. Desk lamp and ambient lighting create an atmosphere of wisdom and intimate mentorship.

A substantial wooden desk with a warm pool of light from a quality brass banker's lamp. An open book, reading glasses, a glass of whiskey or tea, a leather journal. The items of someone who thinks deeply.

Floor-to-ceiling bookshelves recede into shadow but catch enough light to show their richness. Books, meaningful objects, photographs of family and achievements create depth and story.

Two leather club chairs near a fireplace or in a conversation corner, soft lamplight between them. The setup invites deep, meaningful discussion. A chessboard, a shared book, glasses of something warm.

Windows show twilight sky or early evening. The warm interior light contrasts beautifully with the cool blue hour outside. Quality curtains, wood floors, a Persian rug.

Right side in warm shadow - intimate and welcoming.

The mood is wise, reflective, meaningful - the feeling of learning from someone who has walked the path before you. Color palette of warm amber, rich wood, burgundy, forest green, brass gold.

Cinematic interior photography, shot on RED, 50mm lens, f/2.8. Distinguished and warm, editorial style. 8K photorealistic.`,

    night: `Photorealistic interior photography of an intimate home study late at night. Warm focused lighting creates a cocoon for deep work and meaningful reflection.

A desk lamp casts a warm pool of light on an open book and notebook filled with notes. A cup of tea sending up steam. The desk is a workspace of ideas - papers, books stacked, quality pen in hand.

Bookshelves fade into warm darkness but their presence is felt. This is a room built for thinking. One small reading lamp illuminates a leather chair where deep reading happens.

Windows show the deep blue of night with distant lights. The contrast between the warm interior sanctuary and the vast night outside is powerful. Rain on windows optional.

Personal touches visible in the lamplight - family photos, mentor's own mentors' photographs, objects with meaning. A lifetime of learning in one room.

Right side in darkness with just enough warm light at edges to feel cozy not void.

The mood is profound, intimate, philosophical - late night conversations about what really matters in life. Color palette of warm amber spotlight, surrounding darkness, deep blue from windows, rich wood and leather tones.

Low light photography, shot on Sony A7S III, 35mm lens, f/1.4. Intimate and wise, cinematic style. 8K photorealistic.`,
  },

  family: {
    morning: `Photorealistic interior photography of a warm welcoming kitchen and family room on a sunny morning. The heart of a loving home filled with light and comfort.

A bright open kitchen with warm wood cabinets, marble or butcher block countertops. Morning light streaming through windows over the sink. Fresh coffee brewing, pancakes on a griddle, fruit in a bowl. The making of a family breakfast.

The connected family room has a large comfortable sectional sofa with soft washable slipcovers, lots of throw pillows, cozy blankets. A coffee table with family photos, kids' art proudly displayed on the fridge and walls.

Signs of family life everywhere - a toy peeking out, school artwork, a family calendar, photos from vacations and celebrations. Plants thriving from love. A dog bed in the corner maybe.

Large windows fill the space with golden morning light. Hardwood floors with a durable area rug. Everything is quality but meant to be lived in and loved.

Right side shows the cozy family room seating in warm light.

The atmosphere is love, safety, home - like visiting your favorite family member who always makes you feel completely welcome. Color palette of warm whites, honey wood, soft blues and yellows, family warmth.

Lifestyle family photography, shot on Canon R5, 35mm lens, f/4. Warm and inviting, editorial family home style. 8K photorealistic.`,

    day: `Photorealistic interior photography of a bright cheerful family living space on a beautiful afternoon. A home full of life and love and happy chaos.

An open floor plan living room connected to a sunny kitchen. Comfortable large sofa that fits the whole family, covered in pillows and a few inevitable stains of a well-loved home. Toy storage that doesn't quite contain all the toys.

Signs of active family life - a kid's drawing on the coffee table with crayons, a tablet showing a paused show, board games on a shelf, books for all ages, family photos covering every surface.

Bright afternoon light pours through big windows showing a backyard. The kitchen counter has after-school snacks laid out. Everything is clean-enough but clearly lived in.

Personal touches everywhere - growth chart on a doorframe, art projects, family vacation souvenirs, sports trophies, the accumulation of family memories.

Right portion in clear cheerful light.

The mood is active, loving, alive - a home where childhood is happening and being treasured. Color palette of sunny warm tones, grass green, sky blue, happy colors everywhere.

Family lifestyle photography, shot on Nikon Z9, 24mm lens, f/5.6. Authentic family home, editorial style. 8K photorealistic.`,

    evening: `Photorealistic interior photography of a cozy family home in warm evening light. Dinner time settling into family time, golden hour glow mixing with warm interior lighting.

The living room after a good day - a big comfortable sofa where the family gathers, soft blankets for movie night, pillows for fort-building. A coffee table with the remnants of family dinner lingering.

Warm lamps create cozy pools of light. The kitchen in the background shows a dishwasher running, family dinner was a success. Through windows, sunset colors paint the sky.

Evidence of a day well-lived - school bags dropped, a pet sleeping contentedly, toys that will be cleaned up after the kids are in bed, a family calendar full of activities and love.

Family photos in warm light, kids' artwork displayed proudly, books read a thousand times, treasured objects and heirlooms. A piano or guitar suggesting family music time.

Right side in soft warm light, cozy not dark.

The atmosphere is contentment, gratitude, togetherness - that golden evening hour when families reconnect after busy days. Color palette of warm sunset golds, cozy amber, soft pinks, comfortable neutrals.

Family editorial photography, shot on Sony A7IV, 35mm lens, f/2.8. Warm and sentimental, lifestyle style. 8K photorealistic.`,

    night: `Photorealistic interior photography of a peaceful family home late at night. The quiet magic after children are in bed, soft lighting creating sanctuary.

A comfortable living room in soft lamplight. The couch where parents finally sit together, soft blankets, two cups of tea or glasses of wine. The day's chaos tidied but evidence of children everywhere - a forgotten toy, tiny shoes by the door.

Low warm lighting from a few lamps creates intimate atmosphere. The TV off or showing something quiet. Family photos visible in the soft light, artwork from the kids, the objects of a family's history.

Through windows, the neighborhood sleeps under stars or soft rain. A nightlight glowing from a hallway leading to kids' rooms. The peaceful quiet of a sleeping house.

The kitchen clean and ready for tomorrow. A lunch box waiting to be packed. The refrigerator covered in masterpieces and schedules. Signs of organized loving chaos.

Right side in gentle darkness.

The mood is peace, love, tired-but-grateful - the quiet hours parents treasure when the house is finally still. Color palette of soft warm amber, gentle shadows, cozy cream, peaceful blues.

Intimate low light photography, shot on Sony A7S III, 35mm lens, f/1.8. Tender and real, documentary family style. 8K photorealistic.`,
  },

  custom: {
    morning: `Photorealistic interior photography of a modern comfortable living space in soft morning light. Versatile and welcoming atmosphere that feels like a fresh start.

A bright open room with clean modern furniture - a comfortable minimalist sofa in light gray, a sleek coffee table, a quality armchair. Morning light streams through large windows creating a fresh energized feeling.

The space is tastefully decorated but neutral enough to feel like anyone's aspirational home. Clean lines, quality materials, a few plants, abstract art, curated bookshelves with interesting titles.

A breakfast bar or side table with fresh coffee, a croissant, a phone and notebook. The feeling of a productive day ahead.

The design is contemporary but warm - light wood, white walls, touches of brass, one accent color in pillows or art. Intentional and calming.

Right side in soft clear light.

The atmosphere is fresh, possible, optimistic - a new day full of potential. Color palette of clean whites, light grays, warm wood, one accent color, green from plants.

Modern interior photography, shot on Hasselblad, 40mm lens, f/5.6. Clean contemporary aesthetic. 8K photorealistic.`,

    day: `Photorealistic interior photography of a bright modern living space during a beautiful afternoon. Abundant natural light creates an open, positive, productive atmosphere.

A contemporary open-plan space with comfortable modern furniture. A sectional sofa, minimalist shelving, a work area that blends seamlessly with living space. Clean and functional but inviting.

Large windows flood the space with natural light, showing trees or cityscape. White or light gray walls keep things bright. Quality area rug, interesting lighting fixtures, curated decor that shows taste without demanding a specific personality.

The space suggests possibility - a laptop on the coffee table, books spanning many interests, art that could spark any conversation. Plants thriving in the good light.

Right portion in clean bright light.

The mood is clarity, openness, potential - a space for thinking, creating, growing. Color palette of bright neutrals, natural light, warm wood accents, clean whites.

Editorial interior photography, shot on Canon R5, 24mm lens, f/4. Modern versatile aesthetic. 8K photorealistic, magazine quality.`,

    evening: `Photorealistic interior photography of a sophisticated living space during evening golden hour. Warm sunset light mixing with ambient interior lighting creates a transitional, reflective atmosphere.

A modern comfortable living room as day turns to evening. The furniture is elegant and inviting - a quality sofa, interesting chair, coffee table with a glass of wine or tea. The space suggests good taste without demanding a personality.

Sunset colors pour through windows while table lamps begin to glow. The mix of natural and artificial light is beautiful. The space transitions from day to night like a deep breath.

Thoughtful decor - art, books, objects with stories, plants. Evidence of an interesting life without specifics. A record player, candles ready to light, the setup for a meaningful evening.

Right side in warm ambient shadow.

The atmosphere is reflective, transitional, peaceful - the contemplative quality of evening settling in. Color palette of warm sunset golds, cool twilight blues, lamp amber, sophisticated neutrals.

Cinematic interior photography, shot on RED, 50mm lens, f/2.8. Moody and sophisticated. 8K photorealistic.`,

    night: `Photorealistic interior photography of a modern living space at night. Warm focused lighting creates intimacy against the darkness outside.

A comfortable contemporary space lit by strategic warm lighting - a table lamp, perhaps LEDs on low, candles. The darkness outside the windows makes the interior feel like a sanctuary.

Modern comfortable furniture in the pool of light - an inviting sofa, quality coffee table with a book and drink, the necessities for a quiet evening. The rest of the room fades into soft shadow.

Through windows, city lights or stars, the world outside continuing while this space exists in its own peaceful bubble. The contrast between warm interior and cool exterior is beautiful.

Minimal but meaningful decor visible in the light - one piece of art, a plant, books suggesting a curious mind.

Right side in soft darkness.

The mood is intimate, protected, reflective - a sanctuary from the world for thinking, connecting, being. Color palette of warm amber pool of light, surrounding darkness, cool blue from windows.

Low light photography, shot on Sony A7S III, 35mm lens, f/1.4. Intimate and atmospheric. 8K photorealistic.`,
  },
};

// =============================================================================
// IMAGE GENERATION
// =============================================================================

interface GenerationResult {
  imageUrl: string;
  seed: number;
}

async function generateImage(prompt: string): Promise<GenerationResult> {
  console.log('🎨 Generating image...');
  console.log('   Prompt preview:', prompt.substring(0, 100) + '...\n');

  const result = await fal.subscribe('fal-ai/flux/dev', {
    input: {
      prompt: prompt,
      image_size: 'landscape_16_9',
      num_inference_steps: 28,
      guidance_scale: 3.5,
      num_images: 1,
      enable_safety_checker: false,
      sync_mode: true,
      output_format: 'jpeg',
    },
    logs: true,
    onQueueUpdate: (update) => {
      if (update.status === 'IN_QUEUE') {
        console.log('   ⏳ In queue...');
      } else if (update.status === 'IN_PROGRESS') {
        console.log('   🔄 Generating...');
      }
    },
  });

  const output = result as { images: { url: string }[]; seed: number };

  if (!output.images || output.images.length === 0) {
    throw new Error('No image generated');
  }

  return {
    imageUrl: output.images[0].url,
    seed: output.seed,
  };
}

// =============================================================================
// DOWNLOAD IMAGE
// =============================================================================

async function downloadImage(url: string, filepath: string): Promise<void> {
  const dir = path.dirname(filepath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Handle data URLs (base64 encoded)
  if (url.startsWith('data:')) {
    const matches = url.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!matches) {
      throw new Error('Invalid data URL format');
    }
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, 'base64');
    fs.writeFileSync(filepath, buffer);
    return;
  }

  // Handle https URLs
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filepath);
    https.get(url, (response) => {
      // Handle redirects
      if (response.statusCode === 301 || response.statusCode === 302) {
        const redirectUrl = response.headers.location;
        if (redirectUrl) {
          downloadImage(redirectUrl, filepath).then(resolve).catch(reject);
          return;
        }
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(filepath, () => {});
      reject(err);
    });
  });
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  const relationshipType = process.argv[2] || 'romantic';
  const timeOfDay = process.argv[3] || 'morning';

  configure();

  const outputDir = path.join(process.cwd(), 'public', 'scenes');

  // Get what to generate
  const typesToGenerate = relationshipType === 'all' 
    ? Object.keys(SCENES) 
    : [relationshipType];

  const timesToGenerate = timeOfDay === 'all'
    ? ['morning', 'day', 'evening', 'night']
    : [timeOfDay];

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  KIRRA SCENE GENERATOR');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`  Types: ${typesToGenerate.join(', ')}`);
  console.log(`  Times: ${timesToGenerate.join(', ')}`);
  console.log(`  Output: ${outputDir}`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  let generated = 0;
  let failed = 0;

  for (const type of typesToGenerate) {
    const scenes = SCENES[type as keyof typeof SCENES];
    if (!scenes) {
      console.error(`❌ Unknown relationship type: ${type}`);
      continue;
    }

    for (const time of timesToGenerate) {
      const prompt = scenes[time as keyof typeof scenes];
      if (!prompt) {
        console.error(`❌ Unknown time of day: ${time}`);
        continue;
      }

      const filename = `${type}-${time}.jpg`;
      const filepath = path.join(outputDir, filename);

      console.log(`\n📸 ${type} / ${time}`);
      console.log('─'.repeat(50));

      try {
        const result = await generateImage(prompt);
        
        console.log('   ✅ Generated!');
        console.log('   🔗 URL type:', result.imageUrl.startsWith('data:') ? 'data URL (base64)' : 'https URL');
        console.log('   📥 Downloading...');
        await downloadImage(result.imageUrl, filepath);
        
        console.log(`   💾 Saved: ${filepath}`);
        console.log(`   🌱 Seed: ${result.seed}`);
        generated++;
      } catch (error) {
        console.error(`   ❌ Failed:`, error);
        failed++;
      }
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log(`  COMPLETE: ${generated} generated, ${failed} failed`);
  console.log('═══════════════════════════════════════════════════════════════\n');
}

main().catch(console.error);
