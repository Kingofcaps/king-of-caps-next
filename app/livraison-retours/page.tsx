import type { Metadata } from "next";
import LegalPage, { type LegalSection } from "@/app/components/LegalPage";

export const metadata: Metadata = {
  title: "Livraison, retours et remboursements",
  description: "Consultez les modalités de livraison, de retour et de remboursement des commandes KING OF CAPS au Bénin et à l’international.",
  alternates: { canonical: "/livraison-retours" },
};

const sections: LegalSection[] = [
  {
    title: "1. Zones de livraison",
    paragraphs: [
      "KING OF CAPS livre les commandes au Bénin. Une livraison internationale peut être proposée selon le pays, la destination, la disponibilité du transporteur et l’acceptation préalable des frais correspondants.",
      "Le client doit fournir des coordonnées et une adresse ou un lieu de remise exacts. Une information incomplète peut retarder la livraison ou nécessiter une nouvelle organisation à la charge du client.",
    ],
  },
  {
    title: "2. Délais et frais",
    paragraphs: [
      "Les délais et frais de livraison dépendent de la destination et sont indiqués lors de la commande ou confirmés directement par KING OF CAPS. Ils constituent des estimations et peuvent évoluer en cas d’aléa de transport, de force majeure ou de difficulté indépendante de la boutique.",
    ],
  },
  {
    title: "3. Réception de la commande",
    paragraphs: [
      "Le client est invité à vérifier l’état et la conformité du produit dès sa réception. En cas de produit endommagé, incorrect ou incomplet, il doit contacter rapidement KING OF CAPS avec son numéro de commande, une description du problème et, si possible, des photographies.",
    ],
  },
  {
    title: "4. Retours",
    paragraphs: [
      "Toute demande de retour est étudiée selon le motif présenté et l’état du produit. Sauf défaut ou erreur imputable à KING OF CAPS, le produit doit être non porté, non détérioré, complet et retourné dans un emballage approprié.",
      "Aucun retour ne doit être expédié sans accord préalable. Après examen de la demande, KING OF CAPS communique l’adresse, les modalités applicables et la prise en charge éventuelle des frais de retour.",
    ],
  },
  {
    title: "5. Remboursements et échanges",
    paragraphs: [
      "Lorsqu’un retour est accepté, KING OF CAPS peut proposer, selon la situation et les disponibilités, un échange, un avoir ou un remboursement. Le remboursement intervient après réception et contrôle du produit retourné, en utilisant dans la mesure du possible le moyen de paiement initial.",
      "Si un produit commandé est finalement en rupture de stock, KING OF CAPS informe le client. La commande concernée peut être annulée et tout montant déjà encaissé pour ce produit est remboursé, sauf si le client accepte une solution de remplacement.",
    ],
  },
  {
    title: "6. Paiement à la livraison",
    paragraphs: [
      "Le paiement à la livraison est proposé uniquement lorsqu’il est disponible pour la destination concernée. Une confirmation préalable peut être demandée. Un refus injustifié ou des absences répétées lors de la remise peuvent conduire à limiter cette option pour de futures commandes.",
    ],
  },
];

export default function ShippingReturnsPage() {
  return <LegalPage eyebrow="SERVICE CLIENT" title="Livraison, retours et remboursements" introduction="Les modalités applicables à l’expédition, à la réception et aux demandes après-vente de vos commandes KING OF CAPS." sections={sections} />;
}
