// Function to toggle between input options
function showOption() {
    document.getElementById("grades-section").style.display = "none";
    document.getElementById("semester-section").style.display = "none"; 
   

    
    document.getElementById("grades-section").style.display = "block";
    
}

// Function to calculate GPA using manual grade inputs
function calculateGPA() {
    // Get input values for grades
    const aplus = parseInt(document.getElementById("aplus").value) || 0;
    const a = parseInt(document.getElementById("a").value) || 0;
    const aminus = parseInt(document.getElementById("aminus").value) || 0;
    const bplus = parseInt(document.getElementById("bplus").value) || 0;
    const b = parseInt(document.getElementById("b").value) || 0;
    const bminus = parseInt(document.getElementById("bminus").value)|| 0; 
    const cplus = parseInt(document.getElementById("cplus").value) || 0;
    const c = parseInt(document.getElementById("c").value) || 0;
    const cminus = parseInt(document.getElementById("cminus").value) || 0;
    const dplus = parseInt(document.getElementById("dplus").value) || 0;
    const d = parseInt(document.getElementById("d").value) || 0;
    const dminus = parseInt(document.getElementById("dminus").value) || 0;
    const f = parseInt(document.getElementById("f").value) || 0;

    //get values for a classes final grade
    const semGrade = parseInt(document.getElementById("semGrade").value) || 0;
    const finalGrade = parseInt(document.getElementById("finalGrade").value)||0; 


    // Get values for semesters, honors, and AP classes
    const semesters = parseInt(document.getElementById("semesters1").value) || 1;
    const honors = parseInt(document.getElementById("honors1").value) || 0;
    const ap = parseInt(document.getElementById("ap1").value) || 0;

    // GPA values for each grade
    const gradePoints = {
        "aplus": 4.33,
        "a": 4.0,
        "aminus": 3.67,
        "bplus": 3.33,
        "b": 3.0,
        "bminus":2.67,
        "cplus":2.33,
        "c":2.0,
        "cminus":1.67,
        "dplus":1.33,
        "d":1.0,
        "dminus":0.67, 
        "f": 0
    };

    // Calculate total grade points and total number of grades
    const totalPoints = (aplus * gradePoints["aplus"]) + 
                        (a * gradePoints["a"]) + 
                        (aminus * gradePoints["aminus"]) + 
                        (bplus * gradePoints["bplus"]) + 
                        (b * gradePoints["b"]) + 
                        (bminus*gradePoints["bminus"])+
                        (cplus * gradePoints["cplus"]) + 
                        (c * gradePoints["c"]) + 
                        (cminus*gradePoints["cminus"])+
                        (dplus * gradePoints["dplus"]) + 
                        (d * gradePoints["d"]) + 
                        (f * gradePoints["f"]);
    const totalGrades = aplus + a + aminus + bplus + b + bminus + cplus + c + cminus + dplus + d + f;

    // Calculate unweighted GPA
    const unweightedGPA = totalGrades > 0 ? totalPoints / totalGrades : 0;

    // Calculate weighted GPA adjustments
    const honorsAdjustment = (honors * 0.096) / semesters;
    const apAdjustment = (ap * 0.143) / semesters;
    const weightedGPA = unweightedGPA + honorsAdjustment + apAdjustment;

    // Display the results
    displayResult(unweightedGPA, weightedGPA);
}

// Function to calculate GPA using current GPA adjustments
function calculateQuickGPA() {
    // Get input values
    const currentGPA = parseFloat(document.getElementById("currentGPA").value) || 0;
    const semesters = parseInt(document.getElementById("semesters2").value) || 1;
    const honors = parseInt(document.getElementById("honors2").value) || 0;
    const ap = parseInt(document.getElementById("ap2").value) || 0;

    // Calculate weighted GPA adjustments
    const honorsAdjustment = (honors * 0.096) / semesters;
    const apAdjustment = (ap * 0.143) / semesters;
    const weightedGPA = currentGPA + honorsAdjustment + apAdjustment;

    // Display the results
    displayResult(currentGPA, weightedGPA);
}

// Function to display the GPA results
function displayResult(unweighted, weighted) {
    document.getElementById("result").innerHTML = `
        <p>Unweighted GPA: <strong>${unweighted.toFixed(3)}</strong></p>
        <p>Weighted GPA: <strong>${weighted.toFixed(3)}</strong></p>
    `;
}
function displayResult2(finalResult) {
    document.getElementById("result2").innerHTML = `
        <p>Unweighted GPA: <strong>${finalResult.toFixed(2)}</strong></p>
        
    `;
}

//function to calculate class grade 
function finalGrade() {
    const semGrade = parseFloat(document.getElementById("semGrade").value) || 0;
    const finalGrade = parseFloat(document.getElementById("finalGrade").value) || 0;

    // Calculate the final grade
    const finalResult = (semGrade * 0.85) + (finalGrade * 0.15);

    displayResult2(finalResult);
}
    

function returnBack(){
    window.location.href = "../index.html"; 
}
function toggleDiv(activeDiv) {
    const div = document.getElementById('grades-section');
    if (div.style.display === 'none') {
        div.style.display = 'block'; // Show the div
    } else {
        div.style.display = 'none'; // Hide the div
    }
}
function toggleDiv2() {
    const div = document.getElementById('semester-section');
    if (div.style.display === 'none') {
        div.style.display = 'block'; // Show the div
    } else {
        div.style.display = 'none'; // Hide the div
    }
}