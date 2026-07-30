import type { Metadata } from "next";
import LegalPage, { type LegalSection } from "@/app/components/LegalPage";

export const metadata: Metadata = {
  title: "Conditions Générales d’Utilisation",
  description: "Consultez les conditions d’utilisation de la boutique en ligne KING OF CAPS, spécialisée dans les casquettes et accessoires au Bénin.",
  alternates: { canonical: "/cgu" },
};

const sections: LegalSection[] = [
  {
    title: "1. Objet et acceptation",
    paragraphs: [
      "Les présentes Conditions Générales d’Utilisation encadrent l’accès au site https://kingofcaps.bj et son utilisation. Le site présente et permet de commander des casquettes et accessoires proposés par KING OF CAPS au Bénin.",
      "En naviguant sur le site ou en passant une commande, l’utilisateur reconnaît avoir pris connaissance des présentes conditions. KING OF CAPS peut les mettre à jour lorsque le fonctionnement du service ou le cadre applicable évolue.",
    ],
  },
  {
    title: "2. Produits, prix et disponibilité",
    items: [
      "Les photographies et descriptions présentent les produits avec le plus de fidélité possible, mais de légères différences de couleur ou de rendu peuvent exister selon l’écran utilisé.",
      "Les prix et frais applicables sont ceux affichés ou confirmés au moment de la commande.",
      "Les offres restent soumises aux stocks disponibles. Une rupture constatée après la commande peut conduire à proposer un remplacement, à annuler la commande ou à rembourser le montant déjà payé.",
    ],
  },
  {
    title: "3. Commandes et paiement",
    paragraphs: [
      "Le client doit fournir des informations exactes et suffisamment complètes pour permettre la confirmation, le paiement et la livraison de sa commande. KING OF CAPS peut contacter le client afin de vérifier ou compléter ces informations.",
      "Selon les options proposées au moment de la commande, le paiement peut être traité via PayDunya, Mobile Money ou être effectué à la livraison lorsque ce service est disponible. La commande n’est définitivement acceptée qu’après confirmation du paiement ou validation expresse par KING OF CAPS.",
    ],
  },
  {
    title: "4. Utilisation du site",
    items: [
      "L’utilisateur s’engage à ne pas perturber le fonctionnement du site, tenter un accès non autorisé ou utiliser son contenu à des fins frauduleuses.",
      "Les textes, visuels, marques et éléments graphiques du site restent protégés. Leur reproduction sans autorisation préalable est interdite, hors usages permis par la loi.",
      "KING OF CAPS veille à maintenir le site accessible, sans pouvoir garantir une disponibilité continue en cas de maintenance, d’incident technique ou de force majeure.",
    ],
  },
  {
    title: "5. Données personnelles et droit applicable",
    paragraphs: [
      "Les données communiquées sont traitées conformément à la Politique de confidentialité du site. Les présentes conditions sont régies par les règles applicables en République du Bénin. En cas de difficulté, le client est invité à contacter KING OF CAPS afin de rechercher une solution amiable avant toute autre démarche.",
    ],
  },
];

export default function TermsPage() {
  return <LegalPage eyebrow="INFORMATIONS LÉGALES" title="Conditions Générales d’Utilisation" introduction="Les règles essentielles pour consulter la boutique KING OF CAPS et utiliser ses services de commande en ligne." sections={sections} />;
}
