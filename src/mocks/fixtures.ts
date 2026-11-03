import { toWei, fromWei } from "../lib/money";
import type { NFT } from "../lib/contracts";
const names = [
  "Emerald Ape #042",
  "Sage Nomad #009",
  "Ivory Baron #088",
  "Golden Beat #207",
  "Violet Nomad #314",
  "Golden Signal #169",
  "Emerald Echo #057",
  "Ivory Soul #112",
  "Sage Horizon #023",
  "Golden Rhythm #218",
  "Violet Dreams #090",
  "Emerald Vision #076",
  "Ivory Legend #045",
  "Golden Future #081",
  "Sage Memory #036",
  "Violet Motion #119",
  "Emerald Rare #101",
  "Golden Dawn #066",
];
const images = ["emerald-card", "sage", "ivory", "golden", "violet", "golden"];
export const fixtures: NFT[] = names.map((name, i) => ({
  id: `nft-${i + 1}`,
  name,
  creator: [
    "Kurio Editions",
    "Nomad Studio",
    "Ivory Collective",
    "Golden Sounds",
    "Nomad Studio",
    "Golden Sounds",
  ][i % 6],
  category: (["Arte", "3D", "Fotografia"] as const)[i % 3],
  price: ["1.19", "1.69", "3.58", "1.98", "1.39", "0.99"][i % 6],
  available: i === 16 ? 0 : i % 6 === 4 ? 1 : 3 + (i % 5),
  image: `/nfts/${images[i % 6]}.webp`,
  galleryImage:
    i % 6 === 0 ? "/nfts/emerald-detail.webp" : `/nfts/${images[i % 6]}.webp`,
  version: 1,
  edition: ["1/50", "1/10", "1/10", "1/50", "1/1", "ABERTA"][i % 6],
  token: name.split("#")[1],
  collection: "Kurio Apes",
  rare: i % 6 === 2,
  description:
    "Um colecionável digital finalizado à mão da coleção Kurio Editions, verificado na Ethereum.",
}));

export const editionFixtures: NFT[] = fixtures.flatMap((base) =>
  [
    { suffix: "one", label: "1/1", num: 2n, den: 1n, available: 1 },
    { suffix: "ten", label: "1/10", num: 3n, den: 2n, available: 2 },
    { suffix: "fifty", label: "1/50", num: 1n, den: 1n, available: 3 },
    { suffix: "open", label: "ABERTA", num: 4n, den: 5n, available: 10 },
  ].filter((v) => v.label !== base.edition).map((v) => ({
    ...base,
    id: `${base.id}-${v.suffix}`,
    parentId: base.id,
    edition: v.label,
    price: fromWei((toWei(base.price) * v.num) / v.den),
    available: v.available,
    version: 1,
  })),
);
