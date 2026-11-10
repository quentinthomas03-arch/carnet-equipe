# Carnet d'équipe

Mon outil personnel de manager : ne rien oublier avant et après chaque point individuel, tenir mes
engagements, préparer les entretiens annuels et l'intégration des nouveaux arrivants.

- **PWA iPhone** installable sur l'écran d'accueil, **100 % hors ligne**.
- **Données 100 % locales** sur le téléphone (IndexedDB). Aucun serveur, aucun compte, aucun suivi.
- Sauvegarde et restauration par **fichier JSON** via le menu de partage iOS.

> Le code est public, les données ne le sont pas : elles ne quittent jamais le téléphone, sauf quand
> tu exportes toi-même un fichier.

---

## Sommaire

1. [Installer l'appli sur l'iPhone](#1-installer-lappli-sur-liphone)
2. [Sauvegarder et restaurer](#2-sauvegarder-et-restaurer)
3. [Limites de Safari sur iPhone](#3-limites-de-safari-sur-iphone)
4. [Déploiement (GitHub Pages)](#4-déploiement-github-pages)
5. [Développement](#5-développement)
6. [Architecture](#6-architecture)
7. [Faire évoluer le schéma de données](#7-faire-évoluer-le-schéma-de-données)

---

## 1. Installer l'appli sur l'iPhone

1. Ouvre **Safari** (pas Chrome : seul Safari permet l'installation complète sur iPhone).
2. Va sur **https://quentinthomas03-arch.github.io/carnet-equipe/**
3. Touche le bouton **Partager** (carré avec une flèche vers le haut).
4. Fais défiler et touche **« Sur l'écran d'accueil »**, puis **Ajouter**.
5. Ouvre l'appli **depuis l'icône** « Carnet » et **uniquement depuis l'icône** à partir de maintenant.

Pourquoi ? Les données saisies dans Safari et celles de l'appli installée sont **deux espaces
séparés**. L'appli installée est aussi mieux protégée contre l'effacement automatique.

**Mises à jour** : rien à faire. Quand une nouvelle version est publiée, elle s'installe toute seule
à l'ouverture suivante (parfois il faut fermer puis rouvrir l'appli une deuxième fois).

## 2. Sauvegarder et restaurer

### Sauvegarder (une fois par mois au minimum)

Une bannière s'affiche dès que ta dernière sauvegarde a plus de 30 jours.

1. Touche **Exporter** (dans la bannière, ou Réglages › *Exporter toutes mes données*).
2. Touche **Enregistrer la sauvegarde**.
3. Dans le menu de partage : **Enregistrer dans Fichiers** › **iCloud Drive** (un dossier
   « Carnet » par exemple) › **Enregistrer**.

Le fichier s'appelle `carnet-equipe-AAAA-MM-JJ.json`. La date de dernière sauvegarde est visible dans
les Réglages.

### Restaurer ou changer de téléphone

1. Installe l'appli sur le nouveau téléphone (section 1).
2. Réglages (roue dentée en haut de l'écran Équipe) › **Importer une sauvegarde**.
3. Choisis le fichier dans Fichiers › iCloud Drive.
4. L'appli **vérifie le fichier** (empreinte SHA-256, nombre d'éléments, cohérence) et affiche un résumé.
5. Choisis :
   - **Fusionner** : ajoute ce qui manque ; quand un élément existe des deux côtés, la version
     **modifiée le plus récemment** est gardée. Rien n'est supprimé.
   - **Remplacer** : efface tout le contenu actuel puis restaure la sauvegarde (confirmation demandée).

Un fichier modifié, tronqué ou venant d'une version plus récente de l'appli est **refusé** et rien
n'est changé.

## 3. Limites de Safari sur iPhone

- **Supprimer l'icône de l'écran d'accueil efface toutes les données** de l'appli.
- Réglages iPhone › Safari › *Effacer historique et données de sites* peut aussi les effacer.
- L'appli demande le **stockage persistant** (`navigator.storage.persist()`) : le navigateur s'engage
  alors à ne pas vider la base pour libérer de la place. Ce n'est pas une garantie absolue : si
  l'iPhone manque gravement d'espace, iOS peut quand même effacer.
- Hors appli installée, Safari peut effacer les données d'un site non visité depuis 7 jours.
- **Pas de notifications** : sans serveur, une PWA ne peut pas envoyer de notifications en arrière-plan.
  Les rappels sont visibles à l'ouverture (écran *Aujourd'hui*, badges, bannières), et les points
  pourront être exportés vers le calendrier de l'iPhone (fichier `.ics`, Phase 2).

👉 **La seule vraie protection est l'export régulier** vers iCloud Drive.

## 4. Déploiement (GitHub Pages)

Le déploiement est **automatique** : chaque modification arrivant sur la branche `main` lance les
tests puis publie l'appli (onglet **Actions** du dépôt pour suivre). Si un test échoue, rien n'est publié.

### Configuration initiale (une seule fois, depuis l'iPhone)

1. Dans Safari, ouvre **github.com** et connecte-toi.
2. Ouvre le dépôt **carnet-equipe** › **Settings** (en mode « site pour ordinateur » si le menu
   n'apparaît pas : bouton **aA** › *Site pour ordinateur*).
3. Menu **Pages** › *Build and deployment* › **Source** : choisis **GitHub Actions**.
4. Onglet **Actions** : relance le dernier workflow *Déployer sur GitHub Pages* si besoin
   (**Run workflow**).
5. Au bout de 1 à 2 minutes, l'appli est en ligne à l'adresse de la section 1.

### Pull requests

Chaque phase est livrée sur une branche avec une pull request. Pour publier :
dépôt › **Pull requests** › ouvrir la PR › **Ready for review** si elle est en brouillon ›
**Merge pull request** › **Confirm merge**. Le déploiement démarre tout seul.

## 5. Développement

Prérequis : Node.js 22.

```bash
npm install
npm run dev        # serveur local
npm test           # tests (Vitest)
npm run build      # vérification TypeScript + build de production dans dist/
```

## 6. Architecture

| Élément | Choix |
| --- | --- |
| Interface | React 18 + TypeScript + Tailwind (design système « Ardoise », mode sombre automatique) |
| Build / PWA | Vite + vite-plugin-pwa (Workbox : tout est précaché, fonctionnement hors ligne) |
| Données | IndexedDB via Dexie, lecture réactive avec `useLiveQuery` |
| Navigation | `HashRouter` (adresses `#/…`, compatibles GitHub Pages) |
| Validation des imports | zod + empreinte SHA-256 |
| Tests | Vitest + fake-indexeddb |

```
src/
  db/          schéma (types.ts), base Dexie (db.ts), migrations, réglages, sauvegarde ↔ base
  domain/      logique pure et testée : dates, sauvegarde/fusion, rappel de sauvegarde…
  lib/         intégrations navigateur : stockage persistant, partage iOS
  ui/          composants de base (boutons, feuilles, icônes, palette)
  components/  composants métier (barre d'onglets, bannière de sauvegarde…)
  pages/       écrans
```

Principe : toute règle de gestion (échéances, retards, rythme des points, onboarding, bilans) vit
dans `src/domain/` sous forme de fonctions pures, couvertes par des tests. Rien de ce qui peut être
recalculé (retards, prochain point suggéré) n'est stocké.

### Format du fichier de sauvegarde

```json
{
  "format": "carnet-equipe",
  "schemaVersion": 1,
  "appVersion": "0.1.0",
  "exportedAt": "2026-11-10T08:00:00.000Z",
  "counts": { "collaborators": 3, "entries": 42, "...": 0 },
  "checksum": "<SHA-256 de { schemaVersion, data } en JSON à clés triées>",
  "data": { "collaborators": [], "entries": [], "...": [] }
}
```

Les réglages propres à l'appareil (date de dernière sauvegarde, première ouverture…) ne sont pas
exportés.

## 7. Faire évoluer le schéma de données

1. Modifier les types dans `src/db/types.ts`.
2. Incrémenter `SCHEMA_VERSION` dans `src/db/migrations.ts` et ajouter `MIGRATIONS[n]` (pour les
   fichiers d'export anciens).
3. Ajouter `this.version(n).stores({...}).upgrade(...)` dans `src/db/db.ts` (pour la base du téléphone)
   et mettre à jour `DEXIE_VERSION`. Ne jamais supprimer les versions précédentes.
4. Ajouter un test de migration.

Ainsi, une sauvegarde faite avec n'importe quelle version reste restaurable.
