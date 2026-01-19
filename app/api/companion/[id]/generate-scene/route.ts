import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { SceneAnalysis, SceneGenerationResponse, GeneratedScene } from '@/types/scene';
import { getAudioForTheme, getAnimationForTheme } from '@/types/scene';

// ============================================================================
// CONFIG
// ============================================================================

const COOLDOWN_MINUTES = 20; // Generate new scene every 20 minutes max
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const DEEPSEEK_MODEL = 'deepseek/deepseek-chat';

// SEGMIND CONFIG - SDXL for better quality (~$0.008/image)
const SEGMIND_API_URL = 'https://api.segmind.com/v1/sdxl1.0-txt2img';

// ============================================================================
// SUPABASE ADMIN CLIENT
// ============================================================================

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase credentials');
  }

  return createClient(supabaseUrl, supabaseServiceKey);
}

// ============================================================================
// DEEPSEEK ANALYSIS
// ============================================================================

// Relationship-specific scene guidelines
const RELATIONSHIP_SCENE_GUIDELINES: Record<string, string> = {
  romantic: `RELATIONSHIP TYPE: Romantic Partner
- Create intimate, couple-appropriate scenes (bedroom, candlelit dinner, sunset walks, cozy nights in)
- Atmosphere should feel warm, loving, and emotionally connected
- Include romantic elements: soft lighting, warm colors, intimate spaces
- Settings: luxurious bedrooms, romantic restaurants, scenic overlooks, cozy living rooms
- Avoid: professional/work settings, group gatherings, overly public spaces`,

  friend: `RELATIONSHIP TYPE: Friend
- Create casual, platonic hangout settings (coffee shops, parks, game rooms, living rooms)
- Atmosphere should feel fun, relaxed, and friendly
- Include social elements: comfortable seating, casual environments
- Settings: cafes, parks, arcades, casual restaurants, backyard hangouts, movie nights
- Avoid: overly romantic/intimate settings, bedrooms, candlelit atmospheres`,

  mentor: `RELATIONSHIP TYPE: Mentor/Guide
- Create inspiring, professional, or educational settings (libraries, studies, nature for reflection)
- Atmosphere should feel wise, supportive, and growth-oriented
- Include intellectual elements: books, nature, contemplative spaces
- Settings: cozy libraries, mountain overlooks, peaceful gardens, modern offices, coffee shop study sessions
- Avoid: romantic settings, party scenes, overly casual environments`,

  family: `RELATIONSHIP TYPE: Family Member
- Create warm, family-appropriate home settings (kitchen, living room, backyard, family gatherings)
- Atmosphere should feel safe, nurturing, and homey
- Include family elements: comfortable furniture, home cooking vibes, shared spaces
- Settings: family kitchen, living room, backyard BBQ, holiday gatherings, front porch
- Avoid: romantic/intimate settings, bars/clubs, any inappropriate atmospheres`,

  custom: `RELATIONSHIP TYPE: Custom
- Create neutral, versatile settings appropriate for any relationship
- Atmosphere should feel comfortable and adaptable
- Focus on pleasant, universally appropriate environments
- Settings: pleasant outdoor scenes, comfortable neutral interiors, scenic views
- Avoid: anything too intimate or too formal`,
};

async function analyzeConversation(
  messages: Array<{ role: string; content: string }>,
  relationshipType: string
): Promise<SceneAnalysis> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('Missing OPENROUTER_API_KEY');
  }

  // Format messages for analysis
  const formattedChat = messages
    .slice(-15) // Last 15 messages
    .map(m => `${m.role === 'user' ? 'User' : 'Companion'}: ${m.content}`)
    .join('\n');

  // Get relationship-specific guidelines
  const relationshipGuidelines = RELATIONSHIP_SCENE_GUIDELINES[relationshipType] || RELATIONSHIP_SCENE_GUIDELINES.custom;

  const systemPrompt = `You are a scene analyzer for an AI companion chat application. 
Analyze the conversation and extract visual scene information.

${relationshipGuidelines}

Return ONLY valid JSON in this exact format:
{
  "theme": "short theme description (2-4 words)",
  "entities": ["entity1", "entity2", "entity3"],
  "scene_description": "A vivid, detailed description of the ideal scene visualization (1-2 sentences). Focus on setting, lighting, mood, and atmosphere. Make it photorealistic and cinematic. MUST be appropriate for the relationship type above.",
  "mood": "the emotional mood (romantic, cozy, adventurous, peaceful, energetic, melancholic, etc)",
  "time_of_day": "morning|day|evening|night",
  "weather": "clear|cloudy|rainy|snowy|stormy|foggy"
}

Guidelines:
- Theme should capture the main topic/setting being discussed
- Entities are concrete objects/elements that should appear in the scene
- Scene description should be suitable for an image generation prompt
- IMPORTANT: Always respect the relationship type boundaries above
- If the conversation is generic/unclear, default to a setting appropriate for the relationship type
- Always make scenes feel warm, inviting, and appropriate for BOTH the chat context AND relationship type`;

  const response = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://kirra.app',
      'X-Title': 'Kirra Scene Generator',
    },
    body: JSON.stringify({
      model: DEEPSEEK_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Analyze this conversation and extract scene information:\n\n${formattedChat}` },
      ],
      temperature: 0.7,
      max_tokens: 500,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('DeepSeek API error:', error);
    throw new Error(`DeepSeek API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error('No content from DeepSeek');
  }

  // Parse JSON from response (handle markdown code blocks)
  let jsonStr = content;
  if (content.includes('```json')) {
    jsonStr = content.split('```json')[1].split('```')[0].trim();
  } else if (content.includes('```')) {
    jsonStr = content.split('```')[1].split('```')[0].trim();
  }

  try {
    const analysis = JSON.parse(jsonStr) as SceneAnalysis;
    return analysis;
  } catch (parseError) {
    console.error('Failed to parse DeepSeek response:', content);
    // Return default analysis based on relationship type
    const defaults: Record<string, SceneAnalysis> = {
      romantic: {
        theme: 'cozy evening together',
        entities: ['soft lighting', 'comfortable couch', 'warm blankets'],
        scene_description: 'A warm, intimate living space with soft ambient lighting, plush seating, and a peaceful romantic atmosphere.',
        mood: 'romantic',
        time_of_day: 'evening',
        weather: 'clear',
      },
      friend: {
        theme: 'casual hangout',
        entities: ['comfortable seating', 'coffee table', 'warm lighting'],
        scene_description: 'A relaxed, casual living room perfect for friendly conversation, with comfortable furniture and a welcoming atmosphere.',
        mood: 'friendly',
        time_of_day: 'day',
        weather: 'clear',
      },
      mentor: {
        theme: 'inspiring study space',
        entities: ['bookshelves', 'desk', 'warm lamp'],
        scene_description: 'A cozy library or study with warm lighting, surrounded by books, creating an atmosphere of wisdom and growth.',
        mood: 'thoughtful',
        time_of_day: 'evening',
        weather: 'clear',
      },
      family: {
        theme: 'warm family home',
        entities: ['family photos', 'comfortable furniture', 'warm kitchen'],
        scene_description: 'A warm, welcoming family home with comfortable furniture, family touches, and a nurturing atmosphere.',
        mood: 'warm',
        time_of_day: 'day',
        weather: 'clear',
      },
      custom: {
        theme: 'pleasant scene',
        entities: ['comfortable room', 'warm lighting', 'soft furniture'],
        scene_description: 'A pleasant, comfortable space with soft ambient lighting and a peaceful atmosphere.',
        mood: 'peaceful',
        time_of_day: 'day',
        weather: 'clear',
      },
    };
    return defaults[relationshipType] || defaults.custom;
  }
}

// ============================================================================
// SEGMIND IMAGE GENERATION (~$0.008/image SDXL)
// ============================================================================

async function generateImage(sceneDescription: string): Promise<{ buffer: Buffer }> {
  const apiKey = process.env.SEGMIND_API_KEY;
  if (!apiKey) {
    throw new Error('Missing SEGMIND_API_KEY');
  }

  // Build enhanced prompt - FORCE PHOTOREALISM
  const enhancedPrompt = `Photorealistic photograph of: ${sceneDescription}

STYLE: Real photography only, NOT illustration, NOT cartoon, NOT digital art, NOT anime
CAMERA: Shot on Canon EOS R5, 35mm lens, f/2.8, natural lighting
QUALITY: 8K, ultra detailed, magazine quality, professional photo
LOOK: Cinematic, atmospheric, beautiful composition, depth of field`;

  const response = await fetch(SEGMIND_API_URL, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt: enhancedPrompt,
      negative_prompt: 'cartoon, anime, illustration, drawing, painting, sketch, digital art, vector, stylized, artistic, graphic novel, comic, watercolor, oil painting, 3d render, cgi, unrealistic, fake, low quality, blurry, ugly, distorted, deformed, text, watermark, logo, signature, oversaturated',
      samples: 1,
      scheduler: 'UniPC',
      num_inference_steps: 30,
      guidance_scale: 9,
      seed: -1,
      img_width: 1024,
      img_height: 576,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Segmind API error:', errorText);
    
    // 406 = Not enough credits
    if (response.status === 406) {
      throw new Error('Segmind: Not enough credits. Add credits at cloud.segmind.com');
    }
    
    throw new Error(`Segmind API error: ${response.status}`);
  }

  // Segmind returns raw JPEG binary, not JSON
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  
  // Verify it's a valid JPEG (starts with FFD8)
  if (buffer.length < 2 || buffer[0] !== 0xFF || buffer[1] !== 0xD8) {
    console.error('Segmind returned invalid image data, length:', buffer.length);
    throw new Error('Segmind did not return a valid JPEG image');
  }

  console.log('[Scene] Image generated, size:', buffer.length, 'bytes');
  return { buffer };
}

// ============================================================================
// SUPABASE STORAGE
// ============================================================================

async function uploadToSupabase(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  imageBuffer: Buffer,
  userId: string,
  companionId: string
): Promise<string> {
  // Generate unique filename
  const timestamp = Date.now();
  const filename = `${userId}/${companionId}/${timestamp}.jpg`;

  // Upload to Supabase Storage
  const { data, error } = await supabase.storage
    .from('generated-scenes')
    .upload(filename, imageBuffer, {
      contentType: 'image/jpeg',
      upsert: false,
    });

  if (error) {
    console.error('Supabase upload error:', error);
    throw new Error(`Failed to upload to Supabase: ${error.message}`);
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from('generated-scenes')
    .getPublicUrl(filename);

  return urlData.publicUrl;
}

// ============================================================================
// COOLDOWN CHECK
// ============================================================================

async function checkCooldown(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  userId: string,
  companionId: string
): Promise<{ canGenerate: boolean; cooldownRemaining: number; lastTheme?: string }> {
  const { data: tracker } = await supabase
    .from('scene_generation_tracker')
    .select('last_generation_at, last_theme')
    .eq('user_id', userId)
    .eq('companion_id', companionId)
    .single();

  if (!tracker) {
    return { canGenerate: true, cooldownRemaining: 0 };
  }

  const lastGen = new Date(tracker.last_generation_at).getTime();
  const now = Date.now();
  const cooldownMs = COOLDOWN_MINUTES * 60 * 1000;
  const elapsed = now - lastGen;

  if (elapsed >= cooldownMs) {
    return { canGenerate: true, cooldownRemaining: 0, lastTheme: tracker.last_theme };
  }

  return {
    canGenerate: false,
    cooldownRemaining: Math.ceil((cooldownMs - elapsed) / 1000),
    lastTheme: tracker.last_theme,
  };
}

// ============================================================================
// UPDATE TRACKER
// ============================================================================

async function updateTracker(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  userId: string,
  companionId: string,
  theme: string
): Promise<void> {
  await supabase
    .from('scene_generation_tracker')
    .upsert({
      user_id: userId,
      companion_id: companionId,
      last_generation_at: new Date().toISOString(),
      last_theme: theme,
      generation_count: 1, // Will be incremented by trigger if exists
    }, {
      onConflict: 'companion_id,user_id',
    });
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<SceneGenerationResponse>> {
  const startTime = Date.now();

  try {
    const { id: companionId } = await params;
    const body = await request.json();
    const { conversationId, messages, relationshipType: providedRelType, forceRegenerate = false } = body;

    // Validate inputs
    if (!companionId || !conversationId || !messages?.length) {
      return NextResponse.json({
        success: false,
        reason: 'Missing required fields: companionId, conversationId, messages',
      }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Get companion's relationship type if not provided
    let relationshipType = providedRelType;
    if (!relationshipType) {
      const { data: companion } = await supabase
        .from('companions')
        .select('relationship_type')
        .eq('id', companionId)
        .single();
      relationshipType = companion?.relationship_type || 'custom';
    }
    console.log('[Scene] Relationship type:', relationshipType);

    // Get user from auth header or session
    const authHeader = request.headers.get('authorization');
    let userId: string | null = null;

    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id || null;
    }

    // Fallback: get user from conversation
    if (!userId) {
      const { data: conversation } = await supabase
        .from('conversations')
        .select('user_id')
        .eq('id', conversationId)
        .single();
      userId = conversation?.user_id;
    }

    if (!userId) {
      return NextResponse.json({
        success: false,
        reason: 'Unauthorized',
      }, { status: 401 });
    }

    // Check cooldown (unless force regenerate)
    if (!forceRegenerate) {
      const cooldown = await checkCooldown(supabase, userId, companionId);
      if (!cooldown.canGenerate) {
        return NextResponse.json({
          success: true,
          skipped: true,
          reason: 'Cooldown active',
          cooldownRemaining: cooldown.cooldownRemaining,
        });
      }
    }

    // Step 1: Analyze conversation with DeepSeek (relationship-aware)
    console.log('[Scene] Analyzing conversation...');
    const analysis = await analyzeConversation(messages, relationshipType);
    console.log('[Scene] Analysis:', analysis.theme);

    // Step 2: Generate image with Segmind (~$0.008/image SDXL)
    console.log('[Scene] Generating image with Segmind...');
    const imageResult = await generateImage(analysis.scene_description);
    console.log('[Scene] Image generated');

    // Step 3: Upload to Supabase Storage
    console.log('[Scene] Uploading to storage...');
    const storedUrl = await uploadToSupabase(supabase, imageResult.buffer, userId, companionId);
    console.log('[Scene] Uploaded:', storedUrl);

    // Step 4: Get audio and animation mappings
    const audioTrack = getAudioForTheme(analysis.theme, analysis.entities);
    const animationType = getAnimationForTheme(analysis.theme, analysis.entities);

    // Step 5: Save to database
    const generationTime = Date.now() - startTime;

    const { data: scene, error: dbError } = await supabase
      .from('generated_scenes')
      .insert({
        companion_id: companionId,
        conversation_id: conversationId,
        user_id: userId,
        prompt: analysis.scene_description,
        image_url: storedUrl,
        theme: analysis.theme,
        entities: analysis.entities,
        scene_description: analysis.scene_description,
        audio_track: audioTrack,
        animation_type: animationType,
        generation_time_ms: generationTime,
        model_used: 'segmind/sdxl1.0-txt2img', // ~$0.008/image - Very Good quality
      })
      .select()
      .single();

    if (dbError) {
      console.error('[Scene] Database error:', dbError);
      throw new Error(`Failed to save scene: ${dbError.message}`);
    }

    // Step 6: Update cooldown tracker
    await updateTracker(supabase, userId, companionId, analysis.theme);

    console.log(`[Scene] Complete in ${generationTime}ms`);

    return NextResponse.json({
      success: true,
      scene: scene as GeneratedScene,
    });

  } catch (error) {
    console.error('[Scene] Generation failed:', error);
    return NextResponse.json({
      success: false,
      reason: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

// ============================================================================
// GET - Retrieve current/recent scene
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id: companionId } = await params;
    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('conversationId');

    const supabase = getSupabaseAdmin();

    // Get most recent scene for this companion
    const query = supabase
      .from('generated_scenes')
      .select('*')
      .eq('companion_id', companionId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (conversationId) {
      query.eq('conversation_id', conversationId);
    }

    const { data: scene, error } = await query.single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      throw error;
    }

    // Check if scene is still valid (not expired)
    if (scene && new Date(scene.expires_at) < new Date()) {
      return NextResponse.json({ scene: null });
    }

    return NextResponse.json({ scene: scene || null });

  } catch (error) {
    console.error('[Scene] Fetch failed:', error);
    return NextResponse.json({ scene: null }, { status: 200 });
  }
}
