const canvas = document.getElementById('matrixCanvas');
const ctx = canvas.getContext('2d');

// Initial canvas dimensions
canvas.height = window.innerHeight;
canvas.width = window.innerWidth;

const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const fontSize = 10;
let columns = canvas.width / fontSize;

const drops = [];
for (let i = 0; i < columns; i++) {
    drops[i] = Math.random() * canvas.height; // Randomize initial drop positions
}

// Create the gradient effect for text
function getTextGradient() {
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
    gradient.addColorStop(0, 'rgba(0, 255, 0, 0.2)');
    gradient.addColorStop(1, 'rgba(0, 255, 0, 0.6)');
    return gradient;
}

function drawMatrixRain() {
    // Set background fill style
    ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Set text fill style
    ctx.fillStyle = getTextGradient();
    ctx.font = fontSize + 'px Courier New';

    for (let i = 0; i < drops.length; i++) {
        const text = characters.charAt(Math.floor(Math.random() * characters.length));
        ctx.fillText(text, i * fontSize, drops[i] * fontSize);

        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
            drops[i] = 0;
        }

        drops[i]++;
    }
}

setInterval(drawMatrixRain, 33);

// Handle window resizing
window.addEventListener('resize', function() {
    canvas.height = window.innerHeight;
    canvas.width = window.innerWidth;

    columns = canvas.width / fontSize;
    while (drops.length < columns) {
        drops.push(Math.random() * canvas.height); // Randomize new drop positions
    }
});
