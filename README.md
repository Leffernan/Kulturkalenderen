# Kulturkalenderen

Komande arrangement frå Bygdebladet sin kulturkalender, med søk på stad og arrangement og filter for månad.

## Innbygging i nettavisa

Lim inn heile blokka i HTML-feltet der kalenderen ligg.

```html
<div data-bb-kulturkalender>
  <iframe
    src="https://leffernan.github.io/Kulturkalenderen/"
    title="Bygdebladet sin kulturkalender"
    height="950"
    style="display:block;width:100%;border:0;background:#F7F3E9"
  ></iframe>
</div>
<script src="https://leffernan.github.io/Kulturkalenderen/embed-host.js" defer></script>
```

Skriptet tilpassar høgda når lesaren søkjer eller viser fleire arrangement.

## Redigering og synkronisering

Redaksjonen oppdaterer den eksisterande kalenderen i Notion. Jobben «Oppdater kulturkalenderen» hentar den offentlege visinga ved 17 minutt over kvar time og oppdaterer `events.json` på greina `calendar-data` når dataa endrar seg. Jobben kan òg køyrast frå Actions. Stad, dato og beskriving blir henta frå Notion.

Den nye visinga viser arrangement fram til og med siste dato, rekna etter norsk tid. Dersom den synkroniserte lista er utilgjengeleg eller det har gått meir enn to kalenderdagar sidan siste kontroll, blir originalkalenderen vist i ramma.

Nye kalenderlinjer kan framleis skrivast som `19. nov - ÅLESUND: Kort omtale.` Fleirdagarsarrangement kan skrivast som `27. nov - 6. des - ÅLESUND: Kort omtale.` Bruk ei overskrift med årstal før arrangement for neste år.
