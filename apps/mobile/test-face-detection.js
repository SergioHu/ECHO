#!/usr/bin/env node

/**
 * Test Multi-Modal Face Detection Integration
 * This script helps verify that all components are properly integrated
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Multi-Modal Face Detection Integration...\n');

// Test files exist
const testFiles = [
  'src/components/camera/AlternativeFaceDetection.ts',
  'src/components/camera/MultiModalFaceDetection.ts',
  'src/components/EchoCameraPro.tsx',
];

const missingFiles = [];

testFiles.forEach(file => {
  const fullPath = path.join(__dirname, file);
  if (fs.existsSync(fullPath)) {
    console.log(`✅ ${file} exists`);
  } else {
    console.log(`❌ ${file} missing`);
    missingFiles.push(file);
  }
});

if (missingFiles.length > 0) {
  console.log('\n❌ Some required files are missing!');
  process.exit(1);
}

console.log('\n🔍 Checking imports and exports...');

// Check EchoCameraPro.tsx for multi-modal imports
const echoCameraPath = path.join(__dirname, 'src/components/EchoCameraPro.tsx');
const echoCameraContent = fs.readFileSync(echoCameraPath, 'utf8');

if (echoCameraContent.includes('MultiModalFaceDetector')) {
  console.log('✅ MultiModalFaceDetector imported in EchoCameraPro');
} else {
  console.log('❌ MultiModalFaceDetector not imported in EchoCameraPro');
}

if (echoCameraContent.includes('createMultiModalFrameProcessor')) {
  console.log('✅ createMultiModalFrameProcessor imported in EchoCameraPro');
} else {
  console.log('❌ createMultiModalFrameProcessor not imported in EchoCameraPro');
}

if (echoCameraContent.includes('useMultiModal')) {
  console.log('✅ useMultiModal state found in EchoCameraPro');
} else {
  console.log('❌ useMultiModal state not found in EchoCameraPro');
}

console.log('\n🚀 Integration test complete!');
console.log('\nNext steps:');
console.log('1. Build the app: npm run android / npm run ios');
console.log('2. Open camera and check console for multi-modal detection logs');
console.log('3. Use debug toggle to switch between multi-modal and legacy modes');
console.log('4. Test with multiple faces to verify improved detection');