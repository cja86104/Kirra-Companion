/**
 * KIRRA SCENE GENERATOR v2.0
 * ==========================
 * 12 time slots per relationship type (every 2 hours)
 * Same room, different lighting throughout the day
 * 
 * Usage:
 *   npx ts-node scripts/generate-scenes.ts romantic 00
 *   npx ts-node scripts/generate-scenes.ts romantic 02
 *   npx ts-node scripts/generate-scenes.ts romantic all
 */

import * as fal from '@fal-ai/serverless-client';
import * as fs from 'fs';
import * as path from 'path';

// =============================================================================
// CONFIGURATION
// =============================================================================

function configure() {
  const key = process.env.FAL_KEY;
  
  if (!key) {
    console.error('❌ FAL_KEY not found in environment variables!');
    console.error('Set it with: $env:FAL_KEY="your_key_here"');
    process.exit(1);
  }
  
  fal.config({ credentials: key });
  console.log('✅ FAL.ai configured\n');
}

// =============================================================================
// TIME SLOTS (every 2 hours)
// =============================================================================

const TIME_SLOTS = ['00', '02', '04', '06', '08', '10', '12', '14', '16', '18', '20', '22'];

// =============================================================================
// ROMANTIC SCENES - Luxury Bedroom
// =============================================================================

const ROMANTIC_BASE = `Photorealistic interior photography of a luxurious modern bedroom. Shot from a comfortable perspective looking across an intimate, beautifully designed space.

The room features: a king-size bed with premium white linen sheets and a plush duvet, soft pillows artfully arranged. A gray upholstered headboard against a wall with subtle texture. Elegant nightstands on each side with designer lamps.

The space has: warm honey oak hardwood floors with a plush cream area rug, floor-to-ceiling windows with sheer linen curtains, a cozy reading chair in the corner, tasteful art on the walls, a few plants adding life, personal touches that make it feel lived-in and loved.

Through the large windows, a view suggesting an upscale urban location - maybe treetops or city glimpses.

The right side of the frame should have space for UI overlay.

Shot on Sony A7IV camera, 35mm lens, f/2.8 aperture, shallow depth of field. Architectural Digest style photography. 8K photorealistic, hyperrealistic detail.`;

const ROMANTIC_SCENES: Record<string, string> = {
  '00': `${ROMANTIC_BASE}

TIME: 12:00 AM - Midnight
LIGHTING: Deep night. The room is dark and peaceful. Soft moonlight filters through the sheer curtains creating silver-blue patches on the bed. A dim nightlight or the subtle glow of a phone charger provides tiny points of warm light. City lights twinkle faintly through the window, creating beautiful distant bokeh.

The bed looks inviting, sheets slightly rumpled from sleep. Everything is quiet and still. The atmosphere is intimate, peaceful, the world asleep.

Color palette: Deep navy blue, silver moonlight, warm amber pinpoints, soft shadows. Low-light night photography aesthetic.`,

  '02': `${ROMANTIC_BASE}

TIME: 2:00 AM - Deep Night
LIGHTING: The quietest hour. Deep blue moonlight is the primary light source, casting gentle shadows. The room is darker than midnight - the deepest part of night. Perhaps clouds have covered some of the city lights.

A subtle warm glow from under the bathroom door or a hallway nightlight. The curtains hang still. Everything feels suspended in time.

The atmosphere is profoundly quiet, intimate, protected - that sacred 2am feeling when the world doesn't exist.

Color palette: Deep indigo, soft silver, minimal warm accents, rich shadows. Very low-light night photography.`,

  '04': `${ROMANTIC_BASE}

TIME: 4:00 AM - Pre-Dawn
LIGHTING: The first subtle hints of dawn. The sky through the window is no longer pure black but the deepest blue with a barely perceptible lighter edge at the horizon. The room is still mostly dark.

Moonlight is fading. The transition between night and day is just beginning - that liminal pre-dawn hour. Perhaps an early bird can be heard.

The atmosphere is anticipatory, quiet, the world holding its breath before sunrise. Still intimate and peaceful but with a hint of the coming day.

Color palette: Deep blue transitioning to purple at horizon, fading silver, first hints of pale gold. Pre-dawn photography aesthetic.`,

  '06': `${ROMANTIC_BASE}

TIME: 6:00 AM - Early Sunrise
LIGHTING: Golden hour begins. Soft warm sunlight is just starting to peek through the curtains, creating the first warm rays across the room. The sky shows pink and orange sunrise colors.

The contrast between the warm sunrise light and the remaining cool shadows is beautiful. The bed catches some of the first golden light. Dust particles might be visible in the light beams.

The atmosphere is fresh, hopeful, romantic - waking up together as the world comes alive. That magical first-light feeling.

Color palette: Soft gold, warm pink, remaining cool blue shadows, gentle orange. Sunrise photography aesthetic.`,

  '08': `${ROMANTIC_BASE}

TIME: 8:00 AM - Morning
LIGHTING: Beautiful morning light fills the room. Golden sunlight streams through the windows at a low angle, creating warm rays and gentle lens flare. The room is bright but the light is still soft and flattering.

The bed might be unmade, suggesting someone just got up. Perhaps a coffee mug on the nightstand, morning routines beginning. The curtains glow with backlight.

The atmosphere is fresh, energized, romantic - lazy weekend morning vibes, nowhere to rush to.

Color palette: Warm golden yellow, soft whites, honey tones, gentle shadows. Morning lifestyle photography aesthetic.`,

  '10': `${ROMANTIC_BASE}

TIME: 10:00 AM - Late Morning  
LIGHTING: Bright late morning light. The sun is higher now, creating strong but still pleasant illumination. Light pours through the windows, filling the room with energy. Some areas might be slightly overexposed in that beautiful lifestyle photography way.

The room feels airy and alive. Perhaps the bed is made now, or still casually unmade. The space feels active, the day in progress.

The atmosphere is bright, positive, alive - mid-morning contentment.

Color palette: Bright warm whites, strong golden light, crisp shadows, airy feeling. Bright lifestyle photography aesthetic.`,

  '12': `${ROMANTIC_BASE}

TIME: 12:00 PM - Midday
LIGHTING: The sun is high, creating even, bright illumination. Light comes in at a steeper angle, less dramatic than morning but bright and clear. The room is at its brightest.

The lighting is more neutral - not the warm gold of morning or the orange of evening, but clean midday light. Shadows are shorter and more defined.

The atmosphere is calm, peaceful, a quiet midday moment - perhaps a lazy afternoon beginning.

Color palette: Clean whites, neutral warm light, defined shadows, bright and clear. Midday photography aesthetic.`,

  '14': `${ROMANTIC_BASE}

TIME: 2:00 PM - Afternoon
LIGHTING: Warm afternoon light. The sun has passed its peak and the light is starting to take on a slightly warmer, more golden quality. Still bright but softer than midday.

The angle of light through the windows is changing, creating longer shadows again. The room feels relaxed, unhurried, afternoon lazy.

The atmosphere is relaxed, warm, content - that slow afternoon feeling.

Color palette: Warm golden undertones, soft afternoon light, lengthening shadows. Afternoon lifestyle photography.`,

  '16': `${ROMANTIC_BASE}

TIME: 4:00 PM - Late Afternoon
LIGHTING: Golden hour approaching. The sunlight is becoming distinctly warmer and more golden. Light streams in at a lower angle, creating beautiful long shadows and warm patches of light on the bed and floor.

The quality of light is becoming more romantic and flattering. The first hints of that magic hour glow. Everything looks a bit more golden.

The atmosphere is warm, romantic, anticipatory - the day winding toward evening.

Color palette: Rich golden, warm amber undertones, long dramatic shadows. Pre-golden-hour photography.`,

  '18': `${ROMANTIC_BASE}

TIME: 6:00 PM - Golden Hour / Sunset
LIGHTING: Peak golden hour. Gorgeous warm orange and pink light floods through the windows. The sun is setting, creating dramatic, romantic lighting with long shadows and warm color everywhere.

The room glows with sunset colors. Through the window, the sky shows beautiful oranges, pinks, and purples. Perhaps a bedside lamp is being turned on, warm artificial light mixing with sunset.

The atmosphere is deeply romantic, magical, intimate - that breathtaking sunset hour.

Color palette: Rich orange, warm pink, golden amber, purple sky accents. Golden hour photography aesthetic.`,

  '20': `${ROMANTIC_BASE}

TIME: 8:00 PM - Dusk / Twilight
LIGHTING: Blue hour transitioning to night. The sun has set, leaving a deep blue twilight sky with traces of purple and pink at the horizon. Interior lamps are now on, creating warm pools of light.

The contrast between the cool blue outside and warm amber inside is beautiful. City lights are beginning to appear. Candles might be lit.

The atmosphere is romantic, intimate, transitional - day becoming night, settling in together.

Color palette: Deep twilight blue, warm lamp amber, cool and warm contrast. Blue hour photography aesthetic.`,

  '22': `${ROMANTIC_BASE}

TIME: 10:00 PM - Night
LIGHTING: Full night has arrived. The sky through the window is dark with city lights twinkling or stars visible. Interior lighting is warm and intimate - bedside lamps, perhaps candles.

The room is cozy and inviting, lit by warm artificial light. The darkness outside makes the interior feel like a sanctuary. Perhaps the bed is turned down, ready for sleep.

The atmosphere is intimate, cozy, romantic - winding down together, the day complete.

Color palette: Warm amber lamp light, dark blue night outside, city bokeh, intimate shadows. Night interior photography aesthetic.`,
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
  const https = await import('https');
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filepath);
    https.get(url, (response) => {
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
// SCENE REGISTRY
// =============================================================================

const SCENES: Record<string, Record<string, string>> = {
  romantic: ROMANTIC_SCENES,
  // friend: FRIEND_SCENES,      // TODO: Add after romantic is done
  // mentor: MENTOR_SCENES,      // TODO
  // family: FAMILY_SCENES,      // TODO
  // custom: CUSTOM_SCENES,      // TODO
};

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  const relationshipType = process.argv[2] || 'romantic';
  const timeSlot = process.argv[3] || '08';

  configure();

  const outputDir = path.join(process.cwd(), 'public', 'scenes');

  const scenes = SCENES[relationshipType];
  if (!scenes) {
    console.error(`❌ Unknown relationship type: ${relationshipType}`);
    console.log('Available types:', Object.keys(SCENES).join(', '));
    process.exit(1);
  }

  // Determine which time slots to generate
  const slotsToGenerate = timeSlot === 'all' ? TIME_SLOTS : [timeSlot];

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  KIRRA SCENE GENERATOR v2.0');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`  Type: ${relationshipType}`);
  console.log(`  Slots: ${slotsToGenerate.join(', ')}`);
  console.log(`  Output: ${outputDir}`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  let generated = 0;
  let failed = 0;

  for (const slot of slotsToGenerate) {
    const prompt = scenes[slot];
    if (!prompt) {
      console.error(`❌ Unknown time slot: ${slot}`);
      console.log('Available slots:', TIME_SLOTS.join(', '));
      continue;
    }

    const filename = `${relationshipType}-${slot}.jpg`;
    const filepath = path.join(outputDir, filename);

    console.log(`\n📸 ${relationshipType} / ${slot}:00`);
    console.log('─'.repeat(50));

    try {
      const result = await generateImage(prompt);
      
      console.log('   ✅ Generated!');
      console.log('   🔗 URL type:', result.imageUrl.startsWith('data:') ? 'data URL (base64)' : 'https URL');
      console.log('   📥 Downloading...');
      await downloadImage(result.imageUrl, filepath);
      
      console.log(`   💾 Saved: ${filename}`);
      console.log(`   🌱 Seed: ${result.seed}`);
      generated++;
    } catch (error) {
      console.error(`   ❌ Failed:`, error);
      failed++;
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log(`  COMPLETE: ${generated} generated, ${failed} failed`);
  console.log('═══════════════════════════════════════════════════════════════\n');
}

main().catch(console.error);
