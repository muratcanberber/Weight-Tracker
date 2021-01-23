<script>
  $: currentWeight = 0;
  $: targetWeight = 0;
  $: goalDate = new Date();

  let dayLeft = 0;
  let weightLossPerADay = 0;
  let weightLossPerAWeek = 0;
  const calcualteWeightLossPerDay = () => {
    let currentDate = new Date();
    let diff = new Date(goalDate) - currentDate; //ms
    dayLeft = diff / 84000000;
    weightLossPerADay = ((currentWeight - targetWeight) / dayLeft).toFixed(2);
    weightLossPerAWeek = (
      ((currentWeight - targetWeight) / dayLeft) *
      7
    ).toFixed(2);
  };

  $: console.log({
    currentWeight,
    targetWeight,
    goalDate,
  });
</script>

<main>
  <div class="title">
    <span class="is-size-1">Weight Tracker</span>
  </div>
  <div class="form">
    <div class="form-items"> 
      <label for="weight">Enter Your Current Weight</label>
      <input type="number" label="weight" bind:value={currentWeight} />
    </div>
    <div class="form-items">
      <label for="weight">Enter Your Target Weight</label>
      <input type="number" label="weight" bind:value={targetWeight} />
    </div>
    <div class="form-items">
      <label for="birthdaytime">Set A Goal Date ! </label>
      <input type="date" name="birthdaytime" bind:value={goalDate} /><br />
    </div>
	<div />
	
  </div>
  <div class="calculateBtn">
	<button class="button is-primary" on:click={calcualteWeightLossPerDay}>Calculate</button >
</div>
  <div class="bottom">
    <span class="is-size-1">To Reach Your Goals You Must Loose Weight :</span>
  </div>
  <div>
	  {#if weightLossPerADay > 0 }	{/if}
    <div class="cards">
      <span class="box1"> {weightLossPerADay} / day</span>
      <span class="box2">{weightLossPerAWeek} / week </span>
	</div>

  </div>
</main>

<svelte:head>
  <link
    rel="stylesheet"
    type="text/css"
    href="https://cdn.jsdelivr.net/npm/bulma@0.8.0/css/bulma.min.css"
  /><script
    src="https://use.fontawesome.com/releases/v5.3.1/js/all.js"></script></svelte:head
>

<style>
  .title {
    display: flex;
    justify-content: center;

  }
  .form {
	  display : flex;
	  justify-content: center;
  }
  .form-items {
	padding : 1%;

  }
  .bottom {
    display: flex;
    justify-content: center;

  }
  .cards {
    display: flex;
    justify-content: center;

  }
  .calculateBtn {
	display: flex;
    justify-content: center;
  }
  .box1 {
	width: 150px;
	height: 75px;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: larger;
	background-color:aquamarine;
	margin: 15px;
  }
  .box2 {
	width: 150px;
	height: 75px;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: larger;
	background-color: cadetblue;
	margin: 15px;
	color: white
  }
</style>
