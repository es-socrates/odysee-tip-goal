const goalWidget = document.getElementById('goal-widget');
const ws = new WebSocket(`ws://localhost:3002`);

ws.onopen = () => {
  console.log('✅ Connected to the tip goal server');
};

ws.onmessage = (event) => {
  try {
    const msg = JSON.parse(event.data);
    if (msg.type === 'goalUpdate') {
      updateGoalDisplay(msg.data);
    }
  } catch (error) {
    console.error('Error processing message:', error);
  }
};

function createParticles(container, count = 20) {
  const particlesContainer = document.createElement('div');
  particlesContainer.className = 'particles';
  
  for (let i = 0; i < count; i++) {
    const particle = document.createElement('div');
    particle.className = 'particle';
    particle.style.left = `${Math.random() * 100}%`;
    
    const duration = 1 + Math.random() * 2;
    const delay = Math.random() * 2;
    
    particle.style.animation = `particle-fall ${duration}s ${delay}s forwards`;
    particlesContainer.appendChild(particle);
  }

  container.appendChild(particlesContainer);

  setTimeout(() => {
    particlesContainer.remove();
  }, 5000);
}

function createConfetti(container, count = 50) {
  const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'];

  for (let i = 0; i < count; i++) {
    const confetti = document.createElement('div');
    confetti.className = 'confetti';

    confetti.style.left = `${Math.random() * 100}%`;
    confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    confetti.style.width = `${5 + Math.random() * 10}px`;
    confetti.style.height = `${5 + Math.random() * 10}px`;
    confetti.style.borderRadius = Math.random() > 0.5 ? '50%' : '0';

    const animationDuration = 2 + Math.random() * 3;
    const animationDelay = Math.random() * 2;

    confetti.style.animation = `
      confetti-fall ${animationDuration}s ${animationDelay}s linear forwards
    `;

    const keyframes = `
      @keyframes confetti-fall {
        0% {
          transform: translateY(-100px) rotate(0deg);
          opacity: 1;
        }
        100% {
          transform: translateY(${200 + Math.random() * 300}px) rotate(${360 + Math.random() * 360}deg);
          opacity: 0;
        }
      }
    `;

    const style = document.createElement('style');
    style.innerHTML = keyframes;
    document.head.appendChild(style);

    container.appendChild(confetti);

    setTimeout(() => {
      confetti.remove();
      style.remove();
    }, (animationDuration + animationDelay) * 1000);
  }
}

function updateGoalDisplay(data) {
  const progressPercentage = data.progress;
  const currentUSD = data.usdValue;
  const goalUSD = data.goalUsd;
  
  const wasCelebrating = goalWidget.classList.contains('celebrating');
  const reachedGoal = progressPercentage >= 100;
  
  goalWidget.innerHTML = `
    <div class="goal-container">
      <div class="goal-header">
        <div class="goal-title">🎯 Monthly tip goal</div>
        <div class="goal-amounts">
          <span class="current-ar">${data.current.toFixed(2)}</span>
          <span class="goal-ar">/ ${data.goal} AR</span>
          <span class="usd-value">$${currentUSD} USD</span>
        </div>
      </div>
      
      <div class="progress-container ${reachedGoal ? 'reached-goal' : ''}">
        <div class="progress-bar" style="width: ${progressPercentage}%"></div>
        <div class="progress-text">${progressPercentage.toFixed(1)}%</div>
      </div>
    </div>
  `;
  
  createConfetti(goalWidget, reachedGoal ? 100 : 15);
  
  if (reachedGoal && !wasCelebrating) {
    goalWidget.classList.add('celebrating');
    
    createParticles(goalWidget, 30);
    
    const progressBar = goalWidget.querySelector('.progress-bar');
    if (progressBar) {
      progressBar.style.background = 'linear-gradient(90deg, #FFD700, #FFEC8B)';
    }
    
    const pulseAnimation = `
      @keyframes pulse {
        0% { box-shadow: 0 0 0 0 rgba(255, 215, 0, 0.7); }
        70% { box-shadow: 0 0 0 15px rgba(255, 215, 0, 0); }
        100% { box-shadow: 0 0 0 0 rgba(255, 215, 0, 0); }
      }
    `;
    
    const style = document.createElement('style');
    style.innerHTML = pulseAnimation;
    document.head.appendChild(style);
    
    goalWidget.style.animation = 'pulse 2s infinite';
  } else if (!reachedGoal && wasCelebrating) {
    goalWidget.classList.remove('celebrating');
    goalWidget.style.animation = '';
  }
}