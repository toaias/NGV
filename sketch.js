// --- Simulation Constants & Data ---
const CANVAS_WIDTH = 900;
const CANVAS_HEIGHT = 700;

// --- Visual Sizes ---
const BASE_WIDTH = 22;
const BASE_HEIGHT = 22;
const BASE_SPACING = 26; // Space between start of bases
const DNA_Y = 120;
const BOUNDARY_Y = 180; // Position for Nucleus/Cytoplasm line
const RNA_POLYMERASE_SIZE = 50;
const MRNA_Y = 220;
const RIBOSOME_WIDTH = 75;
const RIBOSOME_HEIGHT = 50;
const TRNA_SPAWN_Y = 550;
const TRNA_WIDTH = 50;
const TRNA_HEIGHT = 60;
const AA_RADIUS = 14;
const AA_SPACING = 8;

const NUCLEOTIDE_COLORS = {
    A: '#FFADAD', T: '#ADD8E6', U: '#ADD8E6', G: '#90EE90', C: '#FFD6A5', Default: '#E0E0E0'
};
const AMINO_ACID_COLORS = {
    'Met': '#FF6347', 'Phe': '#FFD700', 'Leu': '#ADFF2F', 'Ser': '#00CED1', 'Tyr': '#FF69B4',
    'Cys': '#FFA500', 'Trp': '#8A2BE2', 'Pro': '#A0522D', 'His': '#5F9EA0', 'Gln': '#7FFF00',
    'Arg': '#DC143C', 'Ile': '#00FFFF', 'Thr': '#E9967A', 'Asn': '#8FBC8F', 'Lys': '#483D8B',
    'Val': '#2E8B57', 'Ala': '#F5DEB3', 'Asp': '#FF8C00', 'Glu': '#FF4500', 'Gly': '#D2691E',
    'STOP': '#000000'
};
const GENETIC_CODE = {
    'AUG': 'Met', 'UUU': 'Phe', 'UUC': 'Phe', 'UUA': 'Leu', 'UUG': 'Leu', 'UCU': 'Ser', 'UCC': 'Ser',
    'UCA': 'Ser', 'UCG': 'Ser', 'UAU': 'Tyr', 'UAC': 'Tyr', 'UAA': 'STOP', 'UAG': 'STOP', 'UGU': 'Cys',
    'UGC': 'Cys', 'UGA': 'STOP', 'UGG': 'Trp', 'CUU': 'Leu', 'CUC': 'Leu', 'CUA': 'Leu', 'CUG': 'Leu',
    'CCU': 'Pro', 'CCC': 'Pro', 'CCA': 'Pro', 'CCG': 'Pro', 'CAU': 'His', 'CAC': 'His', 'CAA': 'Gln',
    'CAG': 'Gln', 'CGU': 'Arg', 'CGC': 'Arg', 'CGA': 'Arg', 'CGG': 'Arg', 'AUU': 'Ile', 'AUC': 'Ile',
    'AUA': 'Ile', 'ACU': 'Thr', 'ACC': 'Thr', 'ACA': 'Thr', 'ACG': 'Thr', 'AAU': 'Asn', 'AAC': 'Asn',
    'AAA': 'Lys', 'AAG': 'Lys', 'GUU': 'Val', 'GUC': 'Val', 'GUA': 'Val', 'GUG': 'Val', 'GCU': 'Ala',
    'GCC': 'Ala', 'GCA': 'Ala', 'GCG': 'Ala', 'GAU': 'Asp', 'GAC': 'Asp', 'GAA': 'Glu', 'GAG': 'Glu',
    'GGU': 'Gly', 'GGC': 'Gly', 'GGA': 'Gly', 'GGG': 'Gly',
};

// --- Simulation State Variables ---
let dnaTemplate = "TACGTACGTACGAAATT"; // Longer example: "TACGATTACGGATTACGCGTGCGAAATT"
let mrna = "";
let polypeptide = [];
let availableTRNAs = [];
let draggingTRNA = null;
let dragOffsetX, dragOffsetY;
let stage = 'idle';

// Positions - Initialized using constants
let rnaPolymerase = {
    x: 100,
    y: DNA_Y, // Centered on DNA Y position
    size: RNA_POLYMERASE_SIZE,
    progress: 0
};
let ribosome = { x: 100, y: MRNA_Y - RIBOSOME_HEIGHT * 0.4, width: RIBOSOME_WIDTH, height: RIBOSOME_HEIGHT, progress: 0 };
let ribosomeTargetPos = { x: 0, y: 0 };

let transcriptionSpeed = 1;
let frameCounter = 0;

// HTML Elements
let statusDiv;
let instructionsDiv;
let startTranscriptionBtn;
let startTranslationBtn;
let resetBtn;

// --- p5.js Setup Function ---
function setup() {
    let canvas = createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
    canvas.parent('canvas-container');
    textSize(14); // Default text size
    textAlign(CENTER, CENTER);
    ellipseMode(CENTER);

    // Get HTML elements
    statusDiv = select('#status');
    instructionsDiv = select('#instructions');
    startTranscriptionBtn = select('#start-transcription-btn');
    startTranslationBtn = select('#start-translation-btn');
    resetBtn = select('#reset-btn');

    // Button listeners
    startTranscriptionBtn.mousePressed(initiateTranscription);
    startTranslationBtn.mousePressed(initiateTranslation);
    resetBtn.mousePressed(resetSimulation);

    updateStatus("Idle");
    updateInstructions("Click 'Start Transcription'");
}

// --- p5.js Draw Function (Main Loop) ---
function draw() {
    background(245, 245, 255);

    // Draw boundary first
    drawBoundary();

    // Draw static/background elements
    drawDNA(); // Includes unzipping effect

    // Draw dynamic elements based on stage
    if (stage !== 'idle') {
        drawMRNA();
    }
     if (stage === 'transcribing' || stage === 'transcribed' || stage === 'translating' || stage === 'paused_for_trna' || stage === 'finished') {
        drawRNAPolymerase(); // Drawn centered on DNA_Y
    }
    if (stage === 'translating' || stage === 'paused_for_trna' || stage === 'finished') {
        drawRibosome();
        drawPolypeptide();
    }
    if (stage === 'paused_for_trna') {
        drawAvailableTRNAs(); // Draw non-dragging tRNAs
        highlightRibosomeTarget();
         if (draggingTRNA) {
             drawTRNA(draggingTRNA); // Draw dragging tRNA last (on top)
         }
    }

    // Update simulation state
    if (stage === 'transcribing') {
        updateTranscription();
    } else if (stage === 'translating' || stage === 'paused_for_trna') {
        updateTranslation();
    }

    // Handle tRNA dragging visuals (position update)
    if (draggingTRNA) {
        draggingTRNA.x = mouseX + dragOffsetX;
        draggingTRNA.y = mouseY + dragOffsetY;
    }

    frameCounter++;
}

// --- Drawing Functions ---

function drawBoundary() {
    push(); // Isolate style changes
    stroke(150, 150, 180, 150);
    strokeWeight(3);
    drawingContext.setLineDash([10, 10]);
    line(0, BOUNDARY_Y, width, BOUNDARY_Y);
    drawingContext.setLineDash([]);

    fill(100, 100, 120, 180);
    noStroke();
    textSize(18);
    textAlign(LEFT, CENTER);
    text("Nucleus", 20, BOUNDARY_Y - 20);
    textAlign(RIGHT, CENTER);
    text("Cytoplasm", width - 20, BOUNDARY_Y + 25);

    textAlign(CENTER, CENTER); // Reset alignment
    textSize(14); // Reset text size
    pop();
}

function drawDNA() {
    let x = 50;
    let y = DNA_Y;
    let spacing = BASE_SPACING;
    let baseWidth = BASE_WIDTH;
    let baseHeight = BASE_HEIGHT;

    // Determine polymerase coverage area for unzipping effect
    let polymeraseActive = (stage === 'transcribing' || stage === 'transcribed');
    let polymeraseLeftEdge = polymeraseActive ? rnaPolymerase.x - rnaPolymerase.size / 1.5 : -Infinity;
    let polymeraseRightEdge = polymeraseActive ? rnaPolymerase.x + rnaPolymerase.size / 1.5 : -Infinity;

    // Draw backbone lines (draw behind bases)
    stroke(0);
    strokeWeight(2);
    // Adjust Y slightly for better centering around DNA_Y
    let strandOffset = baseHeight / 2 + 5;
    line(x, y - strandOffset, x + dnaTemplate.length * spacing, y - strandOffset); // Top backbone
    line(x, y + strandOffset, x + dnaTemplate.length * spacing, y + strandOffset); // Bottom backbone

    noStroke();
    textSize(baseHeight * 0.6);
    for (let i = 0; i < dnaTemplate.length; i++) {
        let currentX = x + i * spacing;
        let baseCenterX = currentX + baseWidth / 2;
        let isUnderPolymerase = (baseCenterX > polymeraseLeftEdge && baseCenterX < polymeraseRightEdge);

        // --- Draw Template Strand (Bottom) ---
        let templateBaseY = y + 5; // Position slightly below DNA_Y center
        let base = dnaTemplate[i];
        fill(NUCLEOTIDE_COLORS[base] || NUCLEOTIDE_COLORS.Default);
        rect(currentX, templateBaseY, baseWidth, baseHeight, 4);
        fill(0);
        text(base, baseCenterX, templateBaseY + baseHeight / 2 + 1);

        // --- Draw Complementary Strand (Top) and Connection ---
        let complementaryBaseY = y - baseHeight - 5; // Position slightly above DNA_Y center
        if (!isUnderPolymerase) { // Only draw if NOT under polymerase
            let compBase = getComplementaryDNABase(base);
            fill(NUCLEOTIDE_COLORS[compBase] || NUCLEOTIDE_COLORS.Default);
            rect(currentX, complementaryBaseY, baseWidth, baseHeight, 4);
            fill(0);
            text(compBase, baseCenterX, complementaryBaseY + baseHeight / 2 + 1);

            // Draw connecting lines (H-bonds visualization)
            stroke(180);
            strokeWeight(1);
            // Connect the inner edges of the bases
            line(baseCenterX, complementaryBaseY + baseHeight, baseCenterX, templateBaseY);
            noStroke(); // Turn stroke off again
        } else {
            // Optional: Could draw separated single strands here if needed
        }
    }
     noStroke();
     textSize(14); // Reset default text size
}


function drawRNAPolymerase() {
     if (!rnaPolymerase) return;
    let angle = frameCount * 0.1;
    let mouthAngle = PI / 6 + sin(angle) * PI / 12;

    // Draw slightly larger shape centered at polymerase.y (which is DNA_Y)
    fill(0, 150, 255, 200);
    noStroke();
    arc(rnaPolymerase.x, rnaPolymerase.y, rnaPolymerase.size * 1.1, rnaPolymerase.size * 1.1, mouthAngle, TWO_PI - mouthAngle, PIE);

    // Label
    fill(0);
    textSize(12);
    text("RNAP", rnaPolymerase.x, rnaPolymerase.y);
    textSize(14); // Reset default
}

function drawMRNA() {
    if (!mrna) return;
    let x = 50;
    let y = MRNA_Y;
    let spacing = BASE_SPACING;
    let baseWidth = BASE_WIDTH;
    let baseHeight = BASE_HEIGHT;

    stroke(255, 0, 0);
    strokeWeight(2);
    line(x, y + baseHeight/2, x + mrna.length * spacing, y + baseHeight/2);

    noStroke();
    textSize(baseHeight * 0.6);
    for (let i = 0; i < mrna.length; i++) {
        let currentX = x + i * spacing;
        let base = mrna[i];
        fill(NUCLEOTIDE_COLORS[base] || NUCLEOTIDE_COLORS.Default);
        rect(currentX, y, baseWidth, baseHeight, 4);
        fill(0);
        text(base, currentX + baseWidth / 2, y + baseHeight / 2 + 1);
    }
     noStroke();
     textSize(14);
}

function drawRibosome() {
    if (!ribosome) return;

    fill(150, 75, 0, 200);
    noStroke();
    ellipse(ribosome.x, ribosome.y - ribosome.height * 0.1, ribosome.width, ribosome.height * 0.7); // Large
    ellipse(ribosome.x, ribosome.y + ribosome.height * 0.25, ribosome.width * 0.9, ribosome.height * 0.5); // Small

    fill(255);
    textSize(12);
    text("Ribosome", ribosome.x, ribosome.y);
    textSize(14);

     if (stage === 'paused_for_trna') {
        let codon = mrna.substring(ribosome.progress, ribosome.progress + 3);
        if (codon.length === 3) {
             let codonStartX = 50 + ribosome.progress * BASE_SPACING;
             let codonWidth = 3 * BASE_WIDTH + 2 * (BASE_SPACING - BASE_WIDTH);
             let codonY = MRNA_Y;

             fill(255, 255, 0, 100);
             noStroke();
             rect(codonStartX, codonY - 2, codonWidth, BASE_HEIGHT + 4, 5);

             fill(0);
             textSize(16);
             textStyle(BOLD);
             text(codon, ribosome.x, codonY + BASE_HEIGHT + 20);
             textStyle(NORMAL);
             textSize(14);
        }
     }
}

function drawPolypeptide() {
    if (!polypeptide || polypeptide.length === 0) return;

    let startX = ribosome.x + ribosome.width / 2 + 15;
    let startY = ribosome.y - ribosome.height / 2 + 10;
    let radius = AA_RADIUS;
    let spacing = AA_SPACING;
    let diameter = radius * 2;

    stroke(50);
    strokeWeight(2);
    noFill();
    beginShape();
    curveVertex(startX, startY);
    curveVertex(startX, startY);

    for (let i = 0; i < polypeptide.length; i++) {
        let aa = polypeptide[i];
        let currentX = startX + (i + 1) * (diameter + spacing);
        let currentY = startY + sin(i * 0.6) * 15;
        curveVertex(currentX, currentY);

        fill(AMINO_ACID_COLORS[aa] || '#CCCCCC');
        stroke(50);
        strokeWeight(1);
        ellipse(currentX, currentY, diameter, diameter);
        fill(0);
        noStroke();
        textSize(diameter * 0.45);
        text(aa, currentX, currentY + 1);
    }
     let lastX = startX + polypeptide.length * (diameter + spacing);
     let lastY = startY + sin((polypeptide.length - 1) * 0.6) * 15;
     curveVertex(lastX, lastY);
    endShape();

    noStroke();
    textSize(14);
}

function drawAvailableTRNAs() {
    availableTRNAs.forEach(trna => {
        if (trna !== draggingTRNA) {
            drawTRNA(trna);
        }
    });
}

function drawTRNA(trna) {
    let x = trna.x;
    let y = trna.y;
    let w = TRNA_WIDTH;
    let h = TRNA_HEIGHT;

    push();
    translate(x, y); // Use top-left coordinate system

    // Amino Acid
    let aaCircleDiameter = w * 0.6;
    fill(AMINO_ACID_COLORS[trna.aminoAcid] || '#CCCCCC');
    stroke(50); strokeWeight(1);
    ellipse(w / 2, h * 0.1, aaCircleDiameter, aaCircleDiameter); // Centered horizontally, near top
    fill(0); noStroke(); textSize(aaCircleDiameter * 0.4);
    text(trna.aminoAcid, w / 2, h * 0.1 + 1);

    // tRNA Body
    fill(100, 200, 100, 200); stroke(50); strokeWeight(1);
    rect(w * 0.4, h * 0.25, w * 0.2, h * 0.6, 3); // Stem
    ellipse(w * 0.25, h * 0.5, w * 0.4, h * 0.4); // Left lobe
    ellipse(w * 0.75, h * 0.5, w * 0.4, h * 0.4); // Right lobe
    fill(200, 255, 200);
    ellipse(w / 2, h * 0.85, w * 0.5, h * 0.25); // Anticodon loop

    // Anticodon Text
    fill(0); noStroke(); textSize(14);
    text(trna.anticodon, w / 2, h * 0.85 + 1);

    pop();
    textSize(14); // Reset
}


function highlightRibosomeTarget() {
    let targetX = ribosomeTargetPos.x;
    let targetY = ribosomeTargetPos.y;
    let targetW = TRNA_WIDTH + 15;
    let targetH = TRNA_HEIGHT + 15;

    noFill(); stroke(255, 0, 0, 150); strokeWeight(2.5);
    drawingContext.setLineDash([6, 6]);
    rect(targetX - targetW / 2, targetY - targetH / 2, targetW, targetH, 8);
    drawingContext.setLineDash([]);
    noStroke();
}

// --- Simulation Logic Functions ---

function initiateTranscription() {
    if (stage !== 'idle') return;
    resetSimulationState();
    stage = 'transcribing';
    rnaPolymerase.progress = 0;
    mrna = "";
    startTranscriptionBtn.attribute('disabled', '');
    startTranslationBtn.attribute('disabled', '');
    updateStatus("Transcription Active");
    updateInstructions("RNA Polymerase is synthesizing mRNA...");
}

function updateTranscription() {
    if (rnaPolymerase.progress < dnaTemplate.length) {
        // Target center of the base being transcribed
        let targetX = 50 + rnaPolymerase.progress * BASE_SPACING + BASE_WIDTH / 2;
        rnaPolymerase.x = lerp(rnaPolymerase.x, targetX, 0.1);

        // Add base at intervals based on speed
        if (frameCounter % max(1, floor(30 / transcriptionSpeed)) === 0) {
            if (rnaPolymerase.progress < dnaTemplate.length) {
                let dnaBase = dnaTemplate[rnaPolymerase.progress];
                let rnaBase = getComplementaryRNABase(dnaBase);
                mrna += rnaBase;
                rnaPolymerase.progress++;
            }
        }
    } else {
        // Move polymerase past the end and then finish
        let endX = 50 + dnaTemplate.length * BASE_SPACING + BASE_WIDTH / 2;
        if (abs(rnaPolymerase.x - endX) < 5){
            stage = 'transcribed';
            startTranslationBtn.removeAttribute('disabled');
            updateStatus("Transcription Complete");
            updateInstructions("mRNA ready. Click 'Start Translation'");
        } else {
             rnaPolymerase.x = lerp(rnaPolymerase.x, endX, 0.1);
        }
    }
}

function initiateTranslation() {
    if (stage !== 'transcribed') return;

    let startCodonIndex = mrna.indexOf('AUG');
    if (startCodonIndex === -1) {
         updateStatus("Error: No START codon (AUG) found!");
         updateInstructions("Cannot start translation.");
         stage = 'finished';
         return;
    }
    if (startCodonIndex % 3 !== 0) {
        console.warn(`Start codon AUG found at index ${startCodonIndex}, not multiple of 3.`);
    }

    stage = 'translating';
    ribosome.progress = startCodonIndex;
    polypeptide = [];
    availableTRNAs = [];
    startTranslationBtn.attribute('disabled', '');
    updateStatus("Translation Active");
    updateInstructions("Ribosome positioning at START codon...");

    // Position ribosome directly over start codon center
    let targetX = 50 + (ribosome.progress + 1) * BASE_SPACING + (BASE_WIDTH / 2);
    ribosome.x = targetX;
    ribosome.y = MRNA_Y - RIBOSOME_HEIGHT * 0.4;
}

function updateTranslation() {
     if (stage !== 'translating' && stage !== 'paused_for_trna') return;

    if (ribosome.progress + 3 <= mrna.length) {
        let targetX = 50 + (ribosome.progress + 1) * BASE_SPACING + (BASE_WIDTH / 2);

        if (abs(ribosome.x - targetX) > 1) { // If moving
            ribosome.x = lerp(ribosome.x, targetX, 0.15);
             if (stage === 'paused_for_trna') {
                 stage = 'translating';
                 availableTRNAs = []; // Clear tRNAs when moving
             }
            updateStatus("Translation Active");
            updateInstructions("Ribosome moving to next codon...");
            return;
        }

        // --- At target ---
        ribosome.x = targetX; // Snap to exact position
        let currentCodon = mrna.substring(ribosome.progress, ribosome.progress + 3);

        if (GENETIC_CODE[currentCodon] === 'STOP') {
            stage = 'finished';
            updateStatus("Translation Complete (STOP codon)");
            updateInstructions("Polypeptide finished.");
            availableTRNAs = [];
            ribosome.x += BASE_SPACING; // Move past stop
            return;
        }

        if (stage === 'translating') { // Just arrived, initiate pause
             stage = 'paused_for_trna';
             updateStatus("Translation Paused");
             updateInstructions(`Drag the correct tRNA for codon ${currentCodon}`);
             generateTRNAOptions(currentCodon);
             setRibosomeTargetPosition();
        }
        // If already 'paused_for_trna', wait for interaction

    } else { // End of mRNA reached
        stage = 'finished';
        updateStatus("Translation Complete (End of mRNA)");
        updateInstructions("Polypeptide finished.");
        availableTRNAs = [];
        ribosome.x = 50 + mrna.length * BASE_SPACING; // Move to end
    }
}


function generateTRNAOptions(codon) {
    availableTRNAs = [];
    let correctAminoAcid = GENETIC_CODE[codon];
    let correctAnticodon = codonToAnticodon(codon);

    if (!correctAminoAcid || correctAminoAcid === 'STOP') {
        console.error("Attempted tRNA gen for invalid/STOP codon:", codon); return;
    }

    availableTRNAs.push({ x: 0, y: 0, anticodon: correctAnticodon, aminoAcid: correctAminoAcid, isCorrect: true });

    let numIncorrect = 2;
    let allCodons = Object.keys(GENETIC_CODE);
    let attempts = 0;
    while (availableTRNAs.length < numIncorrect + 1 && attempts < 100) {
        let randomCodon = random(allCodons);
        let randomAA = GENETIC_CODE[randomCodon];
        let randomAnticodon = codonToAnticodon(randomCodon);

        if (randomAnticodon !== correctAnticodon && randomAA !== 'STOP') {
             if (!availableTRNAs.some(trna => trna.anticodon === randomAnticodon)) {
                 availableTRNAs.push({ x: 0, y: 0, anticodon: randomAnticodon, aminoAcid: randomAA, isCorrect: false });
             }
        }
        attempts++;
    }
     if (attempts >= 100) console.warn("Could not generate enough unique incorrect tRNAs.");

     // Distribute horizontally
     let spacingBetweenTRNAs = 40;
     let totalWidthNeeded = availableTRNAs.length * TRNA_WIDTH + (availableTRNAs.length - 1) * spacingBetweenTRNAs;
     let startX = (width - totalWidthNeeded) / 2;

     shuffle(availableTRNAs, true); // Randomize order

     availableTRNAs.forEach((trna, i) => {
         trna.x = startX + i * (TRNA_WIDTH + spacingBetweenTRNAs);
         trna.y = TRNA_SPAWN_Y + random(-25, 25);
         trna.startX = trna.x; // Store original position
         trna.startY = trna.y;
     });
}


function setRibosomeTargetPosition() {
    ribosomeTargetPos.x = ribosome.x;
    ribosomeTargetPos.y = ribosome.y - ribosome.height * 0.6; // Above ribosome
}


function processCorrectTRNA(trna) {
    polypeptide.push(trna.aminoAcid);
    ribosome.progress += 3;
    availableTRNAs = [];
    draggingTRNA = null;
    stage = 'translating'; // Move to next codon
    updateStatus("Translation Active");
    updateInstructions("Correct tRNA! Ribosome moving...");
}

function processIncorrectTRNA(trna) {
    updateStatus("Incorrect tRNA!");
    updateInstructions(`Anticodon ${trna.anticodon} doesn't match codon. Try again.`);
    trna.x = trna.startX; // Snap back
    trna.y = trna.startY;
    draggingTRNA = null; // Stop dragging
}

// --- Interaction Functions ---

function mousePressed() {
    if (stage !== 'paused_for_trna') return;

    for (let i = availableTRNAs.length - 1; i >= 0; i--) { // Check from top
        let trna = availableTRNAs[i];
        if (mouseX > trna.x && mouseX < trna.x + TRNA_WIDTH &&
            mouseY > trna.y && mouseY < trna.y + TRNA_HEIGHT) {
            draggingTRNA = trna;
            dragOffsetX = trna.x - mouseX;
            dragOffsetY = trna.y - mouseY;
            break;
        }
    }
}

function mouseDragged() { /* Position updated in draw() */ }

function mouseReleased() {
    if (draggingTRNA) {
        let dropX = draggingTRNA.x + TRNA_WIDTH / 2;
        let dropY = draggingTRNA.y + TRNA_HEIGHT / 2;
        let targetDist = dist(dropX, dropY, ribosomeTargetPos.x, ribosomeTargetPos.y);
        let tolerance = (TRNA_WIDTH + TRNA_HEIGHT) / 2.5;

        if (targetDist < tolerance) { // Dropped on target
            if (draggingTRNA.isCorrect) {
                processCorrectTRNA(draggingTRNA);
            } else {
                processIncorrectTRNA(draggingTRNA);
            }
        } else { // Not on target, snap back
            draggingTRNA.x = draggingTRNA.startX;
            draggingTRNA.y = draggingTRNA.startY;
            draggingTRNA = null;
        }
    }
    // Ensure dragging always stops on release if not handled above
    if(draggingTRNA) draggingTRNA = null;
}


// --- Utility Functions ---

function getComplementaryRNABase(dnaBase) {
    switch (dnaBase) { case 'A': return 'U'; case 'T': return 'A'; case 'C': return 'G'; case 'G': return 'C'; default: return '?'; }
}
function getComplementaryDNABase(dnaBase) {
     switch (dnaBase) { case 'A': return 'T'; case 'T': return 'A'; case 'C': return 'G'; case 'G': return 'C'; default: return '?'; }
}
function codonToAnticodon(codon) {
    let anticodon = "";
    for (let i = 0; i < codon.length; i++) { anticodon += getComplementaryRNABase(codon[i]); }
    return anticodon.split("").reverse().join("");
}
function updateStatus(message) { if (statusDiv) statusDiv.html(`Status: ${message}`); }
function updateInstructions(message) { if (instructionsDiv) instructionsDiv.html(`${message}`); }

function resetSimulation() {
    resetSimulationState();
    if (startTranscriptionBtn) startTranscriptionBtn.removeAttribute('disabled');
    if (startTranslationBtn) startTranslationBtn.attribute('disabled', '');
    updateStatus("Idle");
    updateInstructions("Click 'Start Transcription'");
}

function resetSimulationState() {
     stage = 'idle';
     mrna = "";
     polypeptide = [];
     availableTRNAs = [];
     draggingTRNA = null;
     frameCounter = 0;

     rnaPolymerase.progress = 0;
     rnaPolymerase.x = 100;
     rnaPolymerase.y = DNA_Y; // Reset to center

     ribosome.progress = 0;
     ribosome.x = 100;
     ribosome.y = MRNA_Y - RIBOSOME_HEIGHT * 0.4;
}