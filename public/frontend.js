const socket = new WebSocket('ws://localhost:3000/ws');  
  
socket.addEventListener('message', (event) => {  
   const data = JSON.parse(event.data);  
   if (data.type === 'vote') {  
      onIncomingVote(data);  
   } else if (data.type === 'newPoll') {  
      onNewPollAdded(data.poll);  
   }  
});  
  
function onIncomingVote(data) {  
   const optionElement = document.querySelector(  
      `[data-poll-id="${data.pollId}"] [data-option-id="${data.optionId}"] .vote-count`  
   );  
   if (optionElement) {  
      optionElement.textContent = data.newVoteCount;  
   }  
}  
  
function onNewPollAdded(poll) {  
   const pollsContainer = document.getElementById('polls');  
   const newPollElement = createPollElement(poll);  
   pollsContainer.appendChild(newPollElement);  
}  
  
function createPollElement(poll) {  
   const pollElement = document.createElement('div');  
   pollElement.className = 'poll-container';  
   pollElement.setAttribute('data-poll-id', poll._id);  
   pollElement.innerHTML = `  
      <h2>${poll.question}</h2>  
      <ul class="poll-options">  
        ${poll.options.map(option => `  
           <li data-option-id="${option._id}">  
              ${option.answer} - Votes: <span class="vote-count">${option.votes}</span>  
              <button onclick="vote('${poll._id}', '${option._id}')">Vote</button>  
           </li>  
        `).join('')}  
      </ul>  
   `;  
   return pollElement;  
}  
  
function vote(pollId, optionId) {  
   socket.send(JSON.stringify({  
      type: 'vote',  
      pollId,  
      optionId  
   }));  
}  
  
// Add event listeners to existing poll forms  
document.querySelectorAll('.poll-form').forEach((pollForm) => {  
   pollForm.addEventListener('submit', (event) => {  
      event.preventDefault();  
      const formData = new FormData(event.target);  
      const pollId = formData.get("poll-id");  
      const optionId = event.submitter.value;  
      vote(pollId, optionId);  
   });  
});
