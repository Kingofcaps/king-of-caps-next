import type { Metadata } from "next";
import LegalPage, { type LegalSection } from "@/app/components/LegalPage";

export const metadata: Metadata = {
  title: "Politique de confidentialité",
  description: "Découvrez comment KING OF CAPS protège et utilise les données nécessaires aux commandes, aux livraisons et au service client.",
  alternates: { canonical: "/politique-confidentialite" },
};

const sections: LegalSection[] = [
  {
    title: "1. Responsable du traitement",
    paragraphs: [
      "KING OF CAPS, boutique de casquettes et accessoires basée au Bénin, est responsable des données personnelles collectées sur https://kingofcaps.bj. Toute question peut être adressée à contact@kingofcaps.bj ou au +229 01 50 68 75 15.",
    ],
  },
  {
    title: "2. Données collectées",
    items: [
      "Informations d’identité et de contact : nom, prénom, téléphone et adresse e-mail lorsqu’elle est fournie.",
      "Informations nécessaires à la commande et à la livraison : produits, quantités, adresse ou lieu de livraison et instructions utiles.",
      "Informations relatives au suivi de la commande et au statut du paiement. KING OF CAPS ne conserve pas les informations bancaires confidentielles saisies auprès du prestataire de paiement.",
      "Préférences conservées localement sur l’appareil, comme le panier ou les favoris, et données techniques strictement nécessaires au fonctionnement et à la sécurité du site.",
    ],
  },
  {
    title: "3. Finalités",
    paragraphs: [
      "Les données personnelles communiquées à KING OF CAPS sont utilisées uniquement pour enregistrer et traiter les commandes, organiser les livraisons, gérer les paiements et répondre aux demandes du service client. Elles ne sont pas utilisées pour constituer ou vendre des fichiers commerciaux.",
    ],
  },
  {
    title: "4. Destinataires et absence de revente",
    paragraphs: [
      "KING OF CAPS ne vend ni ne loue les données personnelles et ne les partage pas à des fins commerciales. Seules les informations strictement nécessaires peuvent être transmises aux prestataires intervenant dans l’exécution de la commande, notamment PayDunya pour le paiement et le service chargé de la livraison. Ces intervenants ne doivent les utiliser que pour la mission concernée.",
    ],
  },
  {
    title: "5. Conservation et sécurité",
    paragraphs: [
      "Les données sont conservées pendant la durée nécessaire au traitement de la commande, au service après-vente et au respect des obligations administratives ou légales applicables. KING OF CAPS met en œuvre des mesures raisonnables pour limiter les accès non autorisés, la perte ou l’altération des informations.",
    ],
  },
  {
    title: "6. Vos droits",
    paragraphs: [
      "Conformément au cadre béninois de protection des données personnelles, vous pouvez demander l’accès, la rectification, la mise à jour ou, lorsque les conditions sont réunies, l’effacement de vos données. Vous pouvez également vous opposer à certains traitements pour un motif légitime. Une demande peut être envoyée à contact@kingofcaps.bj avec les éléments permettant de vous identifier et de retrouver la commande concernée.",
    ],
  },
];

export default function PrivacyPage() {
  return <LegalPage eyebrow="VIE PRIVÉE" title="Politique de confidentialité" introduction="KING OF CAPS limite la collecte aux informations utiles à vos commandes, à leur livraison et à l’accompagnement du service client." sections={sections} />;
}
