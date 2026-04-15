import re

for f in ['dna-evolution', 'life-simulation', 'proactive-check']:
    path = f'app/api/cron/{f}/route.ts'
    text = open(path).read()
    remaining = [
        l.strip() for l in text.split('\n')
        if 'supabaseAdmin' in l
        and '_supabaseAdmin' not in l
        and 'getSupabaseAdmin' not in l
        and 'import' not in l
    ]
    status = 'CLEAN' if not remaining else str(remaining)
    print(f'{f}: {status}')
