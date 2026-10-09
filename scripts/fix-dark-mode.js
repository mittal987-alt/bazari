const fs = require('fs');
const path = require('path');

const filesToFix = [
  'app/(app)/saved/page.tsx',
  'app/(app)/price-estimator/page.tsx',
  'app/(app)/dashboard/seller/page.tsx',
  'app/(app)/dashboard/seller/edit/[id]/page.tsx',
  'app/(app)/dashboard/seller/analytics/page.tsx',
  'app/(app)/budget-shopping/page.tsx',
  'app/(app)/ads/page.tsx'
];

const replacements = [
  // Backgrounds
  { regex: /\bbg-white\b/g, replacement: 'bg-card' },
  { regex: /\bbg-slate-50\b/g, replacement: 'bg-muted' },
  { regex: /\bbg-slate-100\b/g, replacement: 'bg-muted' },
  { regex: /\bbg-slate-200\b/g, replacement: 'bg-muted' },
  
  // Text
  { regex: /\btext-slate-900\b/g, replacement: 'text-foreground' },
  { regex: /\btext-slate-800\b/g, replacement: 'text-foreground' },
  { regex: /\btext-slate-700\b/g, replacement: 'text-foreground' },
  { regex: /\btext-slate-600\b/g, replacement: 'text-muted-foreground' },
  { regex: /\btext-slate-500\b/g, replacement: 'text-muted-foreground' },
  { regex: /\btext-slate-400\b/g, replacement: 'text-muted-foreground' },
  { regex: /\btext-slate-300\b/g, replacement: 'text-muted-foreground' },
  
  // Borders
  { regex: /\bborder-slate-100\b/g, replacement: 'border-border' },
  { regex: /\bborder-slate-200\b/g, replacement: 'border-border' },
  { regex: /\bborder-slate-200\/50\b/g, replacement: 'border-border/50' },
  { regex: /\bborder-slate-300\b/g, replacement: 'border-border' },
  
  // Rings
  { regex: /\bring-slate-200\b/g, replacement: 'ring-border' },
  { regex: /\bring-slate-100\b/g, replacement: 'ring-border' },
  
  // Shadows
  { regex: /\bshadow-slate-200\/50\b/g, replacement: 'shadow-sm' },
  { regex: /\bshadow-slate-100\b/g, replacement: 'shadow-sm' }
];

filesToFix.forEach(relPath => {
  const filePath = path.join(__dirname, 'app', relPath);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;
    
    replacements.forEach(({ regex, replacement }) => {
      content = content.replace(regex, replacement);
    });
    
    if (content !== original) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Updated ${relPath}`);
    } else {
      console.log(`No changes needed for ${relPath}`);
    }
  } else {
    console.log(`File not found: ${relPath}`);
  }
});
