const fs = require('fs');
const vision = require('@google-cloud/vision');
require('dotenv').config({ path: '.env.local' });

async function test() {
  const visionKey = process.env.GOOGLE_CLOUD_VISION_API_KEY;
  console.log("Vision Key exists:", !!visionKey);
  
  if (visionKey) {
    try {
      const client = new vision.ImageAnnotatorClient({
        apiKey: visionKey,
      });

      // We'll just pass a tiny valid base64 image or a dummy buffer
      const buffer = Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
        "base64"
      );

      const [result] = await client.labelDetection(buffer);
      console.log("Result:", result);
    } catch (err) {
      console.error("Vision Error:", err.message);
    }
  }
}
test();
