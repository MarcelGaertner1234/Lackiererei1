#!/bin/bash

# Script to finalize steinschutz-anfrage.html and create werbebeklebung-anfrage.html
# This automates all the repetitive changes needed for the new services

set -e  # Exit on error

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "🚀 Starting automated service creation..."

# ==============================================================================
# PART 1: Finalize steinschutz-anfrage.html
# ==============================================================================
echo "📝 Finalizing steinschutz-anfrage.html..."

# Replace Step 3 content in steinschutz-anfrage.html
# This is complex, so we'll use a here-doc approach

# First, let's update all console.log messages
sed -i '' 's/FOLIERUNG-ANFRAGE/STEINSCHUTZ-ANFRAGE/g' steinschutz-anfrage.html

# Now replace the Step 3 HTML content (Folierungs-Details → Schutz-Details)
# We'll use perl for multi-line replacement

perl -i -p0e 's/<!-- Step 3: Folierungs-Details -->.*?<\/div>\s*<!-- Step 4: Termin -->/<!-- Step 3: Schutz-Details -->
                <div class="wizard-step" data-step="3">
                    <div class="step-title">
                        <span class="icon">🛡️<\/span>
                        <span>Steinschutz-Details<\/span>
                    <\/div>

                    <div class="form-group">
                        <label>Schutzumfang *<\/label>
                        <div class="radio-group">
                            <label class="radio-option selected" onclick="selectSchutzUmfang(this, '\''premium'\'')">
                                <input type="radio" name="schutzUmfang" value="premium" checked>
                                <div class="label">🛡️ Premium-Paket<\/div>
                                <div class="description">Komplettschutz: Front, Motorhaube, Kotflügel, Spiegel, Türkanten, Schweller<\/div>
                            <\/label>
                            <label class="radio-option" onclick="selectSchutzUmfang(this, '\''standard'\'')">
                                <input type="radio" name="schutzUmfang" value="standard">
                                <div class="label">📦 Standard-Paket<\/div>
                                <div class="description">Front, Motorhaube, Seitenspiegel<\/div>
                            <\/label>
                            <label class="radio-option" onclick="selectSchutzUmfang(this, '\''minimal'\'')">
                                <input type="radio" name="schutzUmfang" value="minimal">
                                <div class="label">⚡ Minimal-Paket<\/div>
                                <div class="description">Nur Front-Stoßstange<\/div>
                            <\/label>
                            <label class="radio-option" onclick="selectSchutzUmfang(this, '\''individuell'\'')">
                                <input type="radio" name="schutzUmfang" value="individuell">
                                <div class="label">🎯 Individuell<\/div>
                                <div class="description">Bereiche selbst auswählen<\/div>
                            <\/label>
                        <\/div>
                    <\/div>

                    <div class="form-group" id="bereicheGroup" style="display: none;">
                        <label>Geschützte Bereiche *<\/label>
                        <div class="checkbox-group">
                            <label class="checkbox-option">
                                <input type="checkbox" name="bereiche" value="front-stossstange">
                                <span>🚗 Front-Stoßstange<\/span>
                            <\/label>
                            <label class="checkbox-option">
                                <input type="checkbox" name="bereiche" value="motorhaube-komplett">
                                <span>🔧 Motorhaube (komplett)<\/span>
                            <\/label>
                            <label class="checkbox-option">
                                <input type="checkbox" name="bereiche" value="motorhaube-vorderkante">
                                <span>🔧 Motorhaube (Vorderkante)<\/span>
                            <\/label>
                            <label class="checkbox-option">
                                <input type="checkbox" name="bereiche" value="kotfluegel">
                                <span>⚙️ Kotflügel<\/span>
                            <\/label>
                            <label class="checkbox-option">
                                <input type="checkbox" name="bereiche" value="seitenspiegel">
                                <span>🪞 Seitenspiegel<\/span>
                            <\/label>
                            <label class="checkbox-option">
                                <input type="checkbox" name="bereiche" value="tuerkanten">
                                <span>🚪 Türkanten<\/span>
                            <\/label>
                            <label class="checkbox-option">
                                <input type="checkbox" name="bereiche" value="heckklappenkante">
                                <span>🔙 Heckklappenkante<\/span>
                            <\/label>
                            <label class="checkbox-option">
                                <input type="checkbox" name="bereiche" value="scheinwerfer">
                                <span>💡 Scheinwerfer<\/span>
                            <\/label>
                            <label class="checkbox-option">
                                <input type="checkbox" name="bereiche" value="schweller">
                                <span>🔻 Schweller<\/span>
                            <\/label>
                            <label class="checkbox-option">
                                <input type="checkbox" name="bereiche" value="heck-stossstange">
                                <span>🔙 Heck-Stoßstange<\/span>
                            <\/label>
                        <\/div>
                    <\/div>

                    <div class="form-group">
                        <label>Materialqualität *<\/label>
                        <div class="radio-group">
                            <label class="radio-option selected" onclick="selectMaterial(this, '\''standard'\'')">
                                <input type="radio" name="material" value="standard" checked>
                                <div class="label">📦 Standard PPF<\/div>
                                <div class="description">Hochwertige Steinschutzfolie (5 Jahre Garantie)<\/div>
                            <\/label>
                            <label class="radio-option" onclick="selectMaterial(this, '\''premium'\'')">
                                <input type="radio" name="material" value="premium">
                                <div class="label">💎 Premium PPF<\/div>
                                <div class="description">Premium-Folie mit UV-Schutz (7 Jahre Garantie)<\/div>
                            <\/label>
                            <label class="radio-option" onclick="selectMaterial(this, '\''self-healing'\'')">
                                <input type="radio" name="material" value="self-healing">
                                <div class="label">🔄 Self-Healing<\/div>
                                <div class="description">Selbstheilende Folie (10 Jahre Garantie)<\/div>
                            <\/label>
                        <\/div>
                    <\/div>

                    <div class="form-group">
                        <label>Oberfläche *<\/label>
                        <div class="toggle-group">
                            <label class="toggle-option selected" onclick="selectFinish('\''gloss'\'')">
                                <input type="radio" name="finish" value="gloss" checked>
                                ✨ Hochglanz (Original-Look)
                            <\/label>
                            <label class="toggle-option" onclick="selectFinish('\''matt'\'')">
                                <input type="radio" name="finish" value="matt">
                                🎭 Matt (Stealth-Look)
                            <\/label>
                        <\/div>
                    <\/div>

                    <div class="form-group">
                        <label>Zusatzoptionen (Optional)<\/label>
                        <div class="checkbox-group">
                            <label class="checkbox-option">
                                <input type="checkbox" name="optionen" value="full-coverage-motorhaube">
                                <span>🔄 Full-Coverage Motorhaube<\/span>
                            <\/label>
                            <label class="checkbox-option">
                                <input type="checkbox" name="optionen" value="scheinwerfer-schutz">
                                <span>💡 Scheinwerfer-Schutz<\/span>
                            <\/label>
                            <label class="checkbox-option">
                                <input type="checkbox" name="optionen" value="heck-bumper">
                                <span>🔙 Heck-Bumper<\/span>
                            <\/label>
                        <\/div>
                    <\/div>

                    <div class="form-group">
                        <label for="steinschutzInfo">Zusätzliche Informationen (Optional)<\/label>
                        <textarea id="steinschutzInfo" rows="3" placeholder="z.B. Besondere Anforderungen, vorhandene Lackschäden, etc."><\/textarea>
                    <\/div>
                <\/div>

                <!-- Step 4: Termin -->/gs' steinschutz-anfrage.html

# Update JavaScript validation for Step 3
perl -i -p0e 's/case 3: \/\/ Folierungs-Details.*?return true;/case 3: \/\/ Steinschutz-Details
                    const schutzUmfang = document.querySelector('\''input[name="schutzUmfang"]:checked'\'');
                    const material = document.querySelector('\''input[name="material"]:checked'\'');
                    const finish = document.querySelector('\''input[name="finish"]:checked'\'');

                    if (!schutzUmfang) {
                        alert('\''Bitte wählen Sie den Schutzumfang aus.'\'');
                        return false;
                    }
                    if (!material) {
                        alert('\''Bitte wählen Sie die Materialqualität aus.'\'');
                        return false;
                    }
                    if (!finish) {
                        alert('\''Bitte wählen Sie die Oberfläche aus.'\'');
                        return false;
                    }
                    if (schutzUmfang.value === '\''individuell'\'') {
                        const bereiche = document.querySelectorAll('\''input[name="bereiche"]:checked'\'');
                        if (bereiche.length === 0) {
                            alert('\''Bitte wählen Sie mindestens einen Bereich aus.'\'');
                            return false;
                        }
                    }
                    return true;/gs' steinschutz-anfrage.html

# Update radio selection functions
perl -i -p0e 's/function selectFolierungArt.*?}\s*function selectMaterial.*?}\s*function selectSpezialTyp.*?}/function selectSchutzUmfang(element, value) {
            \/\/ Remove selected class from all options
            element.closest('\''.radio-group'\'').querySelectorAll('\''.radio-option'\'').forEach(opt => {
                opt.classList.remove('\''selected'\'');
            });
            \/\/ Add selected class to clicked option
            element.classList.add('\''selected'\'');
            \/\/ Check the radio input
            element.querySelector('\''input[type="radio"]'\'').checked = true;

            \/\/ Show\/hide bereiche group based on selection
            const bereicheGroup = document.getElementById('\''bereicheGroup'\'');
            if (value === '\''individuell'\'') {
                bereicheGroup.style.display = '\''block'\'';
            } else {
                bereicheGroup.style.display = '\''none'\'';
            }
        }

        function selectMaterial(element, value) {
            \/\/ Remove selected class from all options
            element.closest('\''.radio-group'\'').querySelectorAll('\''.radio-option'\'').forEach(opt => {
                opt.classList.remove('\''selected'\'');
            });
            \/\/ Add selected class to clicked option
            element.classList.add('\''selected'\'');
            \/\/ Check the radio input
            element.querySelector('\''input[type="radio"]'\'').checked = true;
        }

        function selectFinish(value) {
            \/\/ Remove selected class from all toggle options
            document.querySelectorAll('\''.toggle-option'\'').forEach(opt => {
                opt.classList.remove('\''selected'\'');
            });
            \/\/ Add selected class to clicked option
            const option = document.querySelector(`\.toggle-option input[value="${value}"]`).closest('\''.toggle-option'\'');
            option.classList.add('\''selected'\'');
        }/gs' steinschutz-anfrage.html

# Update serviceTyp in submitAnfrage
sed -i '' "s/serviceTyp: 'folierung'/serviceTyp: 'steinschutz'/g" steinschutz-anfrage.html

# Update submitAnfrage data collection
perl -i -p0e 's/\/\/ Get form data\s*const folierungArt.*?info: document\.getElementById\('\''folierungInfo'\''\)\.value\.trim\(\)/\/\/ Get form data
                const schutzUmfang = document.querySelector('\''input[name="schutzUmfang"]:checked'\'').value;
                const material = document.querySelector('\''input[name="material"]:checked'\'').value;
                const finish = document.querySelector('\''input[name="finish"]:checked'\'').value;
                const bereiche = schutzUmfang === '\''individuell'\'' ?
                    Array.from(document.querySelectorAll('\''input[name="bereiche"]:checked'\'')).map(cb => cb.value) : [];
                const optionen = Array.from(document.querySelectorAll('\''input[name="optionen"]:checked'\'')).map(cb => cb.value);

                \/\/ Create anfrage data
                const timestamp = new Date().toISOString();
                const anfrageData = {
                    id: '\''req_'\'' + Date.now(),
                    partnerId: partner.partnerId || partner.id,
                    partnerName: partner.name,
                    partnerEmail: firebase.auth().currentUser.email.toLowerCase(),
                    kundenEmail: firebase.auth().currentUser.email.toLowerCase(),
                    serviceTyp: '\''steinschutz'\'',
                    timestamp: timestamp,
                    erstelltAm: timestamp,
                    serviceData: {
                        umfang: schutzUmfang,
                        bereiche: bereiche,
                        material: material,
                        finish: finish,
                        optionen: optionen,
                        info: document.getElementById('\''steinschutzInfo'\'').value.trim()/gs' steinschutz-anfrage.html

# Update generateSummary function
perl -i -p0e 's/function generateSummary\(\) \{.*?<h3>🌈 Folierungs-Details<\/h3>/function generateSummary() {
            const schutzUmfang = document.querySelector('\''input[name="schutzUmfang"]:checked'\'').value;
            const umfangLabels = {
                '\''premium'\'': '\''🛡️ Premium-Paket'\'',
                '\''standard'\'': '\''📦 Standard-Paket'\'',
                '\''minimal'\'': '\''⚡ Minimal-Paket'\'',
                '\''individuell'\'': '\''🎯 Individuell'\''
            };

            const material = document.querySelector('\''input[name="material"]:checked'\'').value;
            const materialLabels = {
                '\''standard'\'': '\''📦 Standard PPF'\'',
                '\''premium'\'': '\''💎 Premium PPF'\'',
                '\''self-healing'\'': '\''🔄 Self-Healing'\''
            };

            const finish = document.querySelector('\''input[name="finish"]:checked'\'').value;
            const finishLabels = {
                '\''gloss'\'': '\''✨ Hochglanz'\'',
                '\''matt'\'': '\''🎭 Matt'\''
            };

            const bereiche = schutzUmfang === '\''individuell'\'' ?
                Array.from(document.querySelectorAll('\''input[name="bereiche"]:checked'\'')).map(cb => cb.value) : [];
            const optionen = Array.from(document.querySelectorAll('\''input[name="optionen"]:checked'\'')).map(cb => cb.value);

            const summaryContent = document.getElementById('\''summaryContent'\'');
            summaryContent.innerHTML = `
                <div class="summary-section">
                    <h3>🚗 Fahrzeug<\/h3>
                    <p><strong>Kennzeichen:<\/strong> ${document.getElementById('\''kennzeichen'\'').value}<\/p>
                    <p><strong>Marke:<\/strong> ${document.getElementById('\''marke'\'').value}<\/p>
                    <p><strong>Modell:<\/strong> ${document.getElementById('\''modell'\'').value}<\/p>
                <\/div>
                <div class="summary-section">
                    <h3>🛡️ Steinschutz-Details/gs' steinschutz-anfrage.html

echo "✅ steinschutz-anfrage.html finalized!"

# ==============================================================================
# PART 2: Create werbebeklebung-anfrage.html from folierung template
# ==============================================================================
echo "📝 Creating werbebeklebung-anfrage.html..."

cp folierung-anfrage.html werbebeklebung-anfrage.html

# Update all references
sed -i '' 's/Auto Folierung/Fahrzeugbeschriftung/g' werbebeklebung-anfrage.html
sed -i '' 's/FOLIERUNG-ANFRAGE/WERBEBEKLEBUNG-ANFRAGE/g' werbebeklebung-anfrage.html
sed -i '' 's/Folierungs-Details/Werbebeklebungs-Details/g' werbebeklebung-anfrage.html
sed -i '' 's/🌈/📢/g' werbebeklebung-anfrage.html
sed -i '' "s/serviceTyp: 'folierung'/serviceTyp: 'werbebeklebung'/g" werbebeklebung-anfrage.html

echo "✅ werbebeklebung-anfrage.html created!"

echo "🎉 All service files created successfully!"
echo ""
echo "Next steps:"
echo "1. Update service-auswahl.html"
echo "2. Update anfrage-detail.html"
echo "3. Update admin-anfragen.html"
