# Przypomnij PWA

To jest wersja webowa aplikacji do przypomnień, którą możesz uruchomić na iPhonie bez Xcode.

## Co działa

- Dodawanie przypomnienia z tytułem, notatką, datą i godziną.
- Lokalny zapis w przeglądarce przez `localStorage`.
- Widoki: aktywne, zrobione i wszystkie.
- Powiadomienie webowe, jeśli iOS/Safari na to pozwoli.
- Eksport pojedynczego przypomnienia do Kalendarza iPhone’a jako plik `.ics`.
- Tryb offline po pierwszym wejściu, gdy strona działa przez HTTPS.

## Najprostsze uruchomienie na iPhonie

1. Wrzuć zawartość folderu `pwa` na hosting HTTPS, np. GitHub Pages, Netlify albo Cloudflare Pages.
2. Otwórz adres w Safari na iPhonie.
3. Kliknij ikonę udostępniania.
4. Wybierz `Do ekranu początkowego`.
5. Otwórz aplikację z nowej ikony.
6. Kliknij `Włącz`, żeby poprosić o powiadomienia.

## Ważne ograniczenie iOS

Webowe powiadomienia na iPhonie działają tylko w określonych warunkach: aplikacja musi być dodana do ekranu głównego, strona musi być pod HTTPS, a użytkownik musi wyrazić zgodę. Przypomnienia zaplanowane samą stroną są najpewniejsze, gdy aplikacja była ostatnio otwierana.

Dla ważnych rzeczy użyj przycisku `Kalendarz` przy przypomnieniu. Pobierze plik `.ics`, który można dodać do Kalendarza iPhone’a z alarmem o wybranej godzinie.
