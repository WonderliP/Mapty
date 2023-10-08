import L from 'leaflet';

const form = document.querySelector('.form');
const workoutsContainer = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
const btnShowAll = document.querySelector('.show-all');

class Workout {
  id = (Date.now() + '').slice(-10);
  date = new Date();

  constructor(distance, duration, coords) {
    this.distance = distance;
    this.duration = duration;
    this.coords = coords;
  }

  _setDescription(type) {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    this.description = `${type[0].toUpperCase()}${type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }
}

class Running extends Workout {
  type = 'running';

  constructor(distance, duration, coords, cadence) {
    super(distance, duration, coords);
    this.cadence = cadence;
    this.calcPace();

    this._setDescription(this.type);
  }

  calcPace() {
    this.pace = this.duration / this.distance;
  }
}

class Cycling extends Workout {
  type = 'cycling';

  constructor(distance, duration, coords, elevationGain) {
    super(distance, duration, coords);
    this.elevationGain = elevationGain;
    this.calcSpeed();

    this._setDescription(this.type);
  }

  calcSpeed() {
    this.speed = this.distance / (this.duration / 60);
  }
}

class App {
  #map;
  #mapZoomLevel = 13;
  #mapEvent;
  #workouts = [];

  constructor() {
    this._getPosition();

    this._getLocalStorage();

    if (this.#workouts.length > 0) {
      btnShowAll.classList.remove('hidden');
    }

    inputType.addEventListener('change', this._toggleElevationField);
    form.addEventListener('submit', this._newWorkout.bind(this));
    workoutsContainer.addEventListener('click', this._moveToPopup.bind(this));
    btnShowAll.addEventListener('click', this._showAllWorkouts.bind(this));
  }

  _getPosition() {
    if (navigator.geolocation)
      navigator.geolocation.getCurrentPosition(
        position => {
          const { latitude, longitude } = position.coords;
          let coords = [latitude, longitude];

          this._loadMap(coords);

          this.#map.on('click', e => {
            this.#mapEvent = e;
            this._showForm.call(this);
          });
        },
        () => {
          alert('The map cannot be downloaded without your permission');
        }
      );
  }

  _loadMap(position) {
    this.#map = L.map('map').setView(position, this.#mapZoomLevel);

    L.tileLayer('https://tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    this.#workouts.forEach(work => {
      this._renderWorkoutMarker(work);
    });
  }

  _showForm() {
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  _hideForm() {
    form.style.display = 'none';
    form.classList.add('hidden');

    setTimeout(() => {
      form.style.display = 'grid';
    }, 1000);
  }

  _toggleElevationField() {
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _newWorkout(e) {
    e.preventDefault();

    function isAllValidNumbers(...args) {
      return args.every(num => Number.isFinite(num));
    }

    function isAllPositive(...args) {
      return args.every(num => num > 0);
    }

    let workout;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const type = inputType.value;

    const selectedOption = document.querySelector(`[value="${type}"]`);
    selectedOption.setAttribute('selected', '');

    const { lat, lng } = this.#mapEvent.latlng;
    const clickCoords = [lat, lng];

    if (type === 'running') {
      const cadence = +inputCadence.value;

      if (
        !isAllValidNumbers(distance, duration, cadence) ||
        !isAllPositive(distance, duration, cadence)
      )
        return alert('Inputs have to be positive numbers!');

      workout = new Running(distance, duration, clickCoords, cadence);
    }

    if (type === 'cycling') {
      const elevationGain = +inputElevation.value;

      if (
        !isAllValidNumbers(distance, duration, elevationGain) ||
        !isAllPositive(distance, duration)
      )
        return alert('Inputs have to be positive numbers!');

      workout = new Cycling(distance, duration, clickCoords, elevationGain);
    }

    this.#workouts.push(workout);

    form.reset();

    this._hideForm();

    this._renderWorkout(workout);

    this._renderWorkoutMarker(workout);

    this._setLocalStorage();

    if (this.#workouts.length === 1) {
      btnShowAll.classList.remove('hidden');
    }
  }

  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));

    if (!data) return;

    this.#workouts = data;

    this.#workouts.forEach(work => {
      this._renderWorkout(work);
    });
  }

  _renderWorkout(workout) {
    let html = `
    <li class="workout workout--${workout.type}" data-id="${workout.id}">
      <h2 class="workout__title">${workout.description} </h2>
      <div class="workout__details">
        <span class="workout__icon">${
          workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
        }</span>
        <span class="workout__value">${workout.distance}</span>
        <span class="workout__unit">km</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon">⏱</span>
        <span class="workout__value">${workout.duration}</span>
        <span class="workout__unit">min</span>
      </div>
    `;

    if (workout.type === 'running') {
      html += `
        <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${workout.pace.toFixed(1)}</span>
          <span class="workout__unit">min/km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">🦶</span>
          <span class="workout__value">${workout.cadence}</span>
          <span class="workout__unit">spm</span>
        </div>
      </li>
      `;
    }

    if (workout.type === 'cycling') {
      html += `
        <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${workout.speed.toFixed(1)}</span>
          <span class="workout__unit">km/h</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⛰</span>
          <span class="workout__value">${workout.elevationGain}</span>
          <span class="workout__unit">m</span>
          </div>
      </li> 
      `;
    }

    form.insertAdjacentHTML('afterend', html);
  }

  _renderWorkoutMarker(workout) {
    const popupOptions = {
      autoClose: false,
      closeOnClick: false,
      className: `${workout.type}-popup`,
    };

    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`,
        popupOptions
      )
      .openPopup();
  }

  _moveToPopup(e) {
    if (!e.target.closest('.workout')) return;

    const clickedWorkout = this.#workouts.find(
      work => work.id === e.target.closest('.workout').dataset.id
    );

    this.#map.setView(clickedWorkout.coords, this.#mapZoomLevel, {
      pan: {
        animate: true,
        duration: 1,
      },
    });
  }

  _showAllWorkouts() {
    const allCoords = this.#workouts.map(work => work.coords);
    const latlngBounds = L.latLngBounds(allCoords);
    this.#map.fitBounds(latlngBounds);
  }

  reset() {
    localStorage.clear();
    btnShowAll.classList.add('hidden');
    location.reload();
  }
}

const myApp = new App();

// To make possible using the "reset" method from "App" class in the console
window.app = myApp;
