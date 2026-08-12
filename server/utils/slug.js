const slugify = require("slugify");

function makeSlug(value) {
  return slugify(String(value || ""), {
    lower: true,
    strict: true,
    trim: true
  });
}

function uniqueSlug(base, items, currentId) {
  const cleanBase = makeSlug(base) || "item";
  const used = new Set(
    items
      .filter((item) => item.id !== currentId)
      .map((item) => item.slug)
      .filter(Boolean)
  );

  if (!used.has(cleanBase)) return cleanBase;
  let index = 2;
  while (used.has(`${cleanBase}-${index}`)) index += 1;
  return `${cleanBase}-${index}`;
}

module.exports = { makeSlug, uniqueSlug };
