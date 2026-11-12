# Third-party notices

The fork retains LICENSE.txt, bluej/doc/LICENSE.txt, bluej/doc/THIRDPARTYLICENSE.txt and the corresponding Greenfoot documents. Existing desktop dependencies, bundled examples, translations, graphics and packaging remain in their upstream locations. The browser application ships its own CSS, JavaScript and text, uses system fonts and does not copy desktop assets.

The local worker compiles bluej.runtime.BJMap directly from the retained BlueJ source. Its original copyright and license header remain intact. The web application has no added distributed third-party libraries. The host provides OpenJDK 21 and Python 3.9+ including SQLite and OpenSSL-backed scrypt. Browser integration tests use Microsoft Playwright 1.62.1, Apache License 2.0, as a separate development tool; its package contains LICENSE and NOTICE. Chromium is downloaded by CI solely for browser tests, with its own bundled third-party notices. These tools are not included in application downloads.
