import type { Metadata } from "next";
import LegalPage, { type LegalSection } from "@/app/components/LegalPage";

export const metadata: Metadata = {
  title: "Mentions légales",
  description: "Retrouvez les informations légales, coordonnées et conditions d’accès au site officiel KING OF CAPS au Bénin.",
  alternates: { canonical: "/mentions-legales" },
};

const sections: LegalSection[] = [
  {
    title: "1. Éditeur du site",
    items: [
      "Nom commercial : KING OF CAPS",
      "Activité : vente de casquettes et accessoires",
      "Localisation : Cotonou, République du Bénin",
      "Site : https://kingofcaps.bj",
      "Téléphone : +229 01 50 68 75 15",
      "E-mail : contact@kingofcaps.bj",
      "Responsable de la publication : KING OF CAPS",
    ],
  },
  {
    title: "2. Hébergement et services techniques",
    paragraphs: [
      "Le site est hébergé sur l’infrastructure de Vercel. Certains services techniques, notamment le stockage des données et des images, peuvent être fournis par Supabase. Les paiements électroniques proposés sur le site sont traités via PayDunya selon le moyen choisi par le client.",
    ],
  },
  {
    title: "3. Propriété intellectuelle",
    paragraphs: [
      "La structure du site, la marque KING OF CAPS, les textes, photographies, illustrations et autres contenus présentés sont protégés par les droits applicables ou utilisés avec autorisation. Toute reproduction, adaptation ou exploitation non autorisée est interdite.",
      "Les marques de produits ou de services appartenant à des tiers restent la propriété de leurs titulaires respectifs.",
    ],
  },
  {
    title: "4. Exactitude et responsabilité",
    paragraphs: [
      "KING OF CAPS s’efforce de maintenir des informations exactes et à jour. Une erreur, une indisponibilité temporaire ou une rupture de stock peut néanmoins survenir. Les informations du site peuvent être corrigées ou actualisées sans préavis.",
      "Les liens éventuels vers des services tiers sont proposés pour faciliter l’utilisation du site. KING OF CAPS ne contrôle pas leurs contenus ni leurs conditions de fonctionnement.",
    ],
  },
  {
    title: "5. Protection des données",
    paragraphs: [
      "Les traitements de données personnelles sont encadrés par la Politique de confidentialité de KING OF CAPS et par les dispositions applicables du Code du numérique en République du Bénin. Les demandes relatives aux données personnelles peuvent être adressées aux coordonnées indiquées ci-dessus.",
    ],
  },
];

export default function LegalNoticePage() {
  return <LegalPage eyebrow="KING OF CAPS" title="Mentions légales" introduction="Les informations relatives à l’édition, au fonctionnement et à la propriété du site officiel KING OF CAPS." sections={sections} />;
}
