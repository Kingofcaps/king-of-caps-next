async function generateImages() {
  const { readdirSync, writeFileSync } = await import("node:fs");
  const { join } = await import("node:path");

  const imagesDir = join(__dirname, "..", "public", "images");
  const outputFile = join(__dirname, "..", "app", "lib", "images.ts");
  const files = readdirSync(imagesDir).filter(
    (file) =>
      /\.(jpg|jpeg|png|webp)$/i.test(file) &&
      !/^(boutique|logo)\.(jpg|jpeg|png|webp)$/i.test(file),
  );
  const content = `export const images = ${JSON.stringify(files, null, 2)};`;

  writeFileSync(outputFile, content);
  console.log(`✅ ${files.length} images trouvées !`);
}

generateImages().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
