// Configuration
const API_BASE = 'https://autoevaluate.pupujiger.workers.dev';
let authToken = null;
let evaluationQuestions = null;
let currentCourses = [];
let commonAnswers = [];

// DOM Elements
const loginScreen = document.getElementById('loginScreen');
const appScreen = document.getElementById('appScreen');
const loginForm = document.getElementById('loginForm');
const loginAlert = document.getElementById('loginAlert');
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const hamburger = document.getElementById('hamburger');
const navbar = document.getElementById('navbar');
const navItems = document.querySelectorAll('.nav-item');
const viewContents = document.querySelectorAll('.view-content');

// Show alert
function showAlert(message, type) {
  const alertClass = type === 'error' ? 'alert-error' : 'alert-success';
  loginAlert.innerHTML = '<div class="alert ' + alertClass + '">' + message + '</div>';
  setTimeout(function() {
    loginAlert.innerHTML = '';
  }, 5000);
}

// API call helper
async function apiCall(endpoint, method, body) {
  const options = {
    method: method || 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  };
  
  if (authToken) {
    options.headers['Authorization'] = 'Bearer ' + authToken;
  }
  
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  try {
    const response = await fetch(API_BASE + endpoint, options);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('API Error:', error);
    return null;
  }
}

// Login handler
loginForm.addEventListener('submit', async function(e) {
  e.preventDefault();
  
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  
  loginBtn.disabled = true;
  loginBtn.innerHTML = '<div class="spinner"></div><span>Logging in...</span>';
  
  const result = await apiCall('/auth/login', 'POST', {
    username: username,
    password: password
  });
  
  if (result && result.token) {
    authToken = result.token;
    loginScreen.style.display = 'none';
    appScreen.classList.add('active');
  } else {
    showAlert('Login failed. Please check your credentials.', 'error');
  }
  
  loginBtn.disabled = false;
  loginBtn.innerHTML = '<span>Login</span>';
});

// Logout handler
logoutBtn.addEventListener('click', function() {
  authToken = null;
  loginScreen.style.display = 'flex';
  appScreen.classList.remove('active');
  document.getElementById('username').value = '';
  document.getElementById('password').value = '';
});

// Hamburger menu
hamburger.addEventListener('click', function() {
  navbar.classList.toggle('mobile-open');
});

// Navigation
navItems.forEach(function(item) {
  item.addEventListener('click', function() {
    const view = this.getAttribute('data-view');
    switchView(view);
  });
});

// Action cards
document.querySelectorAll('[data-action]').forEach(function(card) {
  card.addEventListener('click', function() {
    const action = this.getAttribute('data-action');
    switchView(action);
  });
});

function switchView(view) {
  navItems.forEach(function(item) {
    item.classList.remove('active');
    if (item.getAttribute('data-view') === view) {
      item.classList.add('active');
    }
  });
  
  viewContents.forEach(function(content) {
    content.classList.add('hidden');
  });
  
  navbar.classList.remove('mobile-open');
  
  if (view === 'home') {
    document.getElementById('homeView').classList.remove('hidden');
  } else if (view === 'evaluate') {
    document.getElementById('evaluateView').classList.remove('hidden');
    loadEvaluateAll();
  } else if (view === 'select') {
    document.getElementById('selectView').classList.remove('hidden');
    loadSelectCourses();
  } else if (view === 'about') {
    document.getElementById('aboutView').classList.remove('hidden');
  }
}

// Make switchView global
window.switchView = switchView;

// Load evaluation questions
async function loadQuestions() {
  if (evaluationQuestions) return evaluationQuestions;
  
  evaluationQuestions = await apiCall('/components_data/evalutation_questions_list', 'GET');
  return evaluationQuestions;
}

// Load courses for evaluation
async function loadCourses(academicYear, semester) {
  const yearParam = encodeURIComponent(academicYear);
  const result = await apiCall('/courses/evaluation?page=1&limit=100&academic_year=' + yearParam + '&semester=' + semester, 'GET');
  
  if (result && result.records) {
    return result.records;
  } else if (result && result.data) {
    return result.data;
  } else if (Array.isArray(result)) {
    return result;
  }
  return [];
}

// Load Evaluate All view
async function loadEvaluateAll() {
  const container = document.getElementById('evaluateView');
  container.innerHTML = '<div class="card"><h2 class="card-title">Loading...</h2></div>';
  
  const years = await apiCall('/components_data/academic_year_option_list', 'GET');
  
  let html = '<div class="card"><h2 class="card-title">Evaluate All Lecturers</h2>';
  html += '<div class="form-group"><label>Select Academic Year</label><select id="yearSelect" class="form-group input">';
  
  if (years && years.length > 0) {
    years.forEach(function(year) {
      html += '<option value="' + year.value + '">' + year.label + '</option>';
    });
  }
  
  html += '</select></div>';
  html += '<div class="form-group"><label>Select Semester</label><select id="semesterSelect" class="form-group input">';
  html += '<option value="1">Semester 1</option><option value="2">Semester 2</option></select></div>';
  html += '<button class="btn btn-primary" id="loadCoursesBtn">Load Courses</button></div>';
  
  container.innerHTML = html;
  
  document.getElementById('loadCoursesBtn').addEventListener('click', async function() {
    const year = document.getElementById('yearSelect').value;
    const semester = document.getElementById('semesterSelect').value;
    
    const courses = await loadCourses(year, semester);
    const unevaluated = courses.filter(function(c) { return c.evaluation_status !== '1'; });
    
    if (unevaluated.length === 0) {
      container.innerHTML = '<div class="card"><h2 class="card-title">All Courses Evaluated!</h2><p style="color: var(--secondary); margin: 20px 0;">You have completed all evaluations for this semester.</p><button class="btn btn-primary" onclick="switchView(\'home\')">Back to Home</button></div>';
      return;
    }
    
    displayCourseList(container, unevaluated, year, semester, true);
  });
}

// Load Select Courses view
async function loadSelectCourses() {
  const container = document.getElementById('selectView');
  container.innerHTML = '<div class="card"><h2 class="card-title">Loading...</h2></div>';
  
  const years = await apiCall('/components_data/academic_year_option_list', 'GET');
  
  let html = '<div class="card"><h2 class="card-title">Select Courses to Evaluate</h2>';
  html += '<div class="form-group"><label>Select Academic Year</label><select id="yearSelectSel" class="form-group input">';
  
  if (years && years.length > 0) {
    years.forEach(function(year) {
      html += '<option value="' + year.value + '">' + year.label + '</option>';
    });
  }
  
  html += '</select></div>';
  html += '<div class="form-group"><label>Select Semester</label><select id="semesterSelectSel" class="form-group input">';
  html += '<option value="1">Semester 1</option><option value="2">Semester 2</option></select></div>';
  html += '<button class="btn btn-primary" id="loadCoursesSelBtn">Load Courses</button></div>';
  
  container.innerHTML = html;
  
  document.getElementById('loadCoursesSelBtn').addEventListener('click', async function() {
    const year = document.getElementById('yearSelectSel').value;
    const semester = document.getElementById('semesterSelectSel').value;
    
    const courses = await loadCourses(year, semester);
    const unevaluated = courses.filter(function(c) { return c.evaluation_status !== '1'; });
    
    if (unevaluated.length === 0) {
      container.innerHTML = '<div class="card"><h2 class="card-title">All Courses Evaluated!</h2><p style="color: var(--secondary); margin: 20px 0;">You have completed all evaluations.</p><button class="btn btn-primary" onclick="switchView(\'home\')">Back to Home</button></div>';
      return;
    }
    
    displaySelectableCourses(container, unevaluated, year, semester);
  });
}

// Display course list
function displayCourseList(container, courses, year, semester, isAll) {
  let html = '<div class="card"><h2 class="card-title">Unevaluated Courses (' + courses.length + ')</h2>';
  html += '<div class="course-list">';
  
  courses.forEach(function(course, idx) {
    html += '<div class="course-item">';
    html += '<div class="course-header">';
    html += '<div><div class="course-code">' + course.code + '</div>';
    html += '<div class="course-title">' + course.title + '</div>';
    html += '<div class="course-lecturer">Lecturer: ' + course.staff_fullname + '</div></div>';
    html += '<span class="badge badge-warning">Pending</span></div></div>';
  });
  
  html += '</div>';
  html += '<div class="btn-group"><button class="btn btn-secondary" onclick="switchView(\'home\')">Cancel</button>';
  html += '<button class="btn btn-success" id="startEvalBtn">Start Evaluation</button></div></div>';
  
  container.innerHTML = html;
  
  document.getElementById('startEvalBtn').addEventListener('click', function() {
    startEvaluationProcess(container, courses, year, semester);
  });
}

// Display selectable courses
function displaySelectableCourses(container, courses, year, semester) {
  let html = '<div class="card"><h2 class="card-title">Select Courses to Evaluate</h2>';
  html += '<div class="course-list">';
  
  courses.forEach(function(course, idx) {
    html += '<div class="course-item" style="cursor: pointer; display: flex; align-items: center;" data-index="' + idx + '">';
    html += '<input type="checkbox" id="course_' + idx + '" style="margin-right: 15px;">';
    html += '<label for="course_' + idx + '" style="cursor: pointer; flex: 1;">';
    html += '<div class="course-code">' + course.code + '</div>';
    html += '<div class="course-title">' + course.title + '</div>';
    html += '<div class="course-lecturer">Lecturer: ' + course.staff_fullname + '</div>';
    html += '</label></div>';
  });
  
  html += '</div>';
  html += '<div class="btn-group"><button class="btn btn-secondary" onclick="switchView(\'home\')">Cancel</button>';
  html += '<button class="btn btn-success" id="startSelEvalBtn">Evaluate Selected</button></div></div>';
  
  container.innerHTML = html;
  
  document.getElementById('startSelEvalBtn').addEventListener('click', function() {
    const selected = [];
    courses.forEach(function(course, idx) {
      if (document.getElementById('course_' + idx).checked) {
        selected.push(course);
      }
    });
    
    if (selected.length === 0) {
      alert('Please select at least one course');
      return;
    }
    
    startEvaluationProcess(container, selected, year, semester);
  });
}

// Start evaluation process
async function startEvaluationProcess(container, courses, year, semester) {
  currentCourses = courses;
  
  const questions = await loadQuestions();
  
  if (!questions) {
    container.innerHTML = '<div class="card"><h2 class="card-title">Error</h2><p style="color: var(--danger);">Failed to load evaluation questions</p><button class="btn btn-primary" onclick="switchView(\'home\')">Back</button></div>';
    return;
  }
  
  displayQuestions(container, questions, courses);
}

// Display questions
function displayQuestions(container, questions, courses) {
  let html = '<div class="card"><h2 class="card-title">Answer Common Questions</h2>';
  html += '<p style="color: #6b7280; margin-bottom: 20px;">These answers will apply to all lecturers</p>';
  
  const standardOptions = ['Excellent', 'Good', 'Average', 'Fair', 'Poor'];
  const participationOptions = ['100%', '80%', '60%', '40%', '20%'];
  const yesNoOptions = ['Yes', 'No'];
  
  questions.forEach(function(category, catIdx) {
    if (category.questions_type && category.questions_type.indexOf('COMMENT') !== -1) {
      return;
    }
    
    html += '<div class="question-section">';
    html += '<div class="question-category">' + category.questions_type + '</div>';
    
    category.questions.forEach(function(q, qIdx) {
      const isLecturerName = q.question.indexOf('name of the lecturer') !== -1 || q.question.indexOf('Provide the name') !== -1;
      const isComment = q.question.indexOf('Mention at least') !== -1 || q.question.indexOf('What factors') !== -1 || q.question.indexOf('What challenges') !== -1 || q.question.indexOf('obstacles') !== -1 || q.question.indexOf('Given another chance') !== -1 || q.question.indexOf('recommendations') !== -1;
      
      if (isLecturerName || isComment) {
        return;
      }
      
      html += '<div class="question-item" data-cat="' + catIdx + '" data-q="' + qIdx + '">';
      html += '<div class="question-text">Q: ' + q.question + '</div>';
      
      let options = standardOptions;
      if (q.question.indexOf('level of participation') !== -1 || q.question.indexOf('level of preparation') !== -1) {
        options = participationOptions;
      } else if (q.question.indexOf('would you want to have another course') !== -1) {
        options = yesNoOptions;
      }
      
      html += '<div class="options">';
      options.forEach(function(opt, optIdx) {
        html += '<div class="option" data-cat="' + catIdx + '" data-q="' + qIdx + '" data-value="' + opt + '">' + opt + '</div>';
      });
      html += '</div></div>';
    });
    
    html += '</div>';
  });
  
  html += '<div class="btn-group"><button class="btn btn-secondary" onclick="switchView(\'home\')">Cancel</button>';
  html += '<button class="btn btn-primary" id="continueToLecturersBtn">Continue</button></div></div>';
  
  container.innerHTML = html;
  
  commonAnswers = [];
  questions.forEach(function(cat) {
    const catAnswers = {
      questions_type: cat.questions_type,
      questions: []
    };
    
    cat.questions.forEach(function(q) {
      catAnswers.questions.push({
        question_id: q.question_id,
        question: q.question,
        answer: ''
      });
    });
    
    commonAnswers.push(catAnswers);
  });
  
  document.querySelectorAll('.option').forEach(function(opt) {
    opt.addEventListener('click', function() {
      const catIdx = parseInt(this.getAttribute('data-cat'));
      const qIdx = parseInt(this.getAttribute('data-q'));
      const value = this.getAttribute('data-value');
      
      document.querySelectorAll('.option[data-cat="' + catIdx + '"][data-q="' + qIdx + '"]').forEach(function(o) {
        o.classList.remove('selected');
      });
      this.classList.add('selected');
      
      commonAnswers[catIdx].questions[qIdx].answer = value;
    });
  });
  
  document.getElementById('continueToLecturersBtn').addEventListener('click', function() {
    collectLecturerNames(container, courses);
  });
}

// Collect lecturer names
function collectLecturerNames(container, courses) {
  let html = '<div class="card"><h2 class="card-title">Enter Lecturer Names</h2>';
  html += '<p style="color: #6b7280; margin-bottom: 20px;">Enter the name of each lecturer (or leave blank to use suggested)</p>';
  
  courses.forEach(function(course, idx) {
    html += '<div class="form-group">';
    html += '<label>Course: ' + course.code + ' - ' + course.title + '</label>';
    html += '<input type="text" class="form-group input" id="lecturer_' + idx + '" placeholder="Suggested: ' + course.staff_fullname + '" data-suggested="' + course.staff_fullname + '" value="' + course.staff_fullname + '">';
    html += '</div>';
  });
  
  html += '<div class="btn-group"><button class="btn btn-secondary" onclick="switchView(\'home\')">Cancel</button>';
  html += '<button class="btn btn-success" id="submitEvalBtn">Submit Evaluations</button></div></div>';
  
  container.innerHTML = html;
  
  document.getElementById('submitEvalBtn').addEventListener('click', function() {
    submitEvaluations(container, courses);
  });
}

// Submit evaluations
async function submitEvaluations(container, courses) {
  container.innerHTML = '<div class="card"><h2 class="card-title">Submitting Evaluations...</h2><div class="progress-bar"><div class="progress-fill" id="progressBar" style="width: 0%"></div></div><div id="progressText" style="text-align: center; margin-top: 20px;">0 / ' + courses.length + '</div></div>';
  
  let success = 0;
  let failed = 0;
  
  for (let i = 0; i < courses.length; i++) {
    const course = courses[i];
    const lecturerInput = document.getElementById('lecturer_' + i);
    const lecturerName = lecturerInput ? (lecturerInput.value || lecturerInput.getAttribute('data-suggested')) : course.staff_fullname;
    
    const answers = JSON.parse(JSON.stringify(commonAnswers));
    
    answers.forEach(function(cat) {
      cat.questions.forEach(function(q) {
        if (q.question.indexOf('name of the lecturer') !== -1 || q.question.indexOf('Provide the name') !== -1) {
          q.answer = lecturerName;
        }
      });
    });
    
    const evalData = {
      answers: answers,
      class_id: course.class_id
    };
    
    const result = await apiCall('/courses/evaluationadd', 'POST', evalData);
    
    if (result) {
      success++;
    } else {
      failed++;
    }
    
    const progress = ((i + 1) / courses.length) * 100;
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    if (progressBar) progressBar.style.width = progress + '%';
    if (progressText) progressText.textContent = (i + 1) + ' / ' + courses.length;
  }
  
  displayResults(container, success, failed);
}

// Display results
function displayResults(container, success, failed) {
  let html = '<div class="card"><h2 class="card-title">Evaluation Complete!</h2>';
  html += '<div class="summary-box">';
  html += '<div class="summary-item"><span>Successful:</span><span style="color: var(--secondary); font-weight: 700;">' + success + '</span></div>';
  html += '<div class="summary-item"><span>Failed:</span><span style="color: var(--danger); font-weight: 700;">' + failed + '</span></div>';
  html += '</div>';
  html += '<p style="margin: 20px 0; color: var(--secondary); font-weight: 600;">Lecturers evaluated successfully!</p>';
  html += '<p style="margin-bottom: 20px; color: #6b7280;">You can verify from your SIP portal in your browser.</p>';
  html += '<div class="link-box">';
  html += '<a href="https://gctusip.gctu.edu.gh" target="_blank" class="btn-link">';
  html += '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/></svg>';
  html += '<span>Visit GCTU SIP Portal</span></a></div>';
  html += '<button class="btn btn-primary" onclick="switchView(\'home\')" style="margin-top: 20px;">Back to Home</button></div>';
  
  container.innerHTML = html;
}
