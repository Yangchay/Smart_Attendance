// public/js/main.js

document.addEventListener('DOMContentLoaded', () => {
    const attendanceDateInput = document.getElementById('attendanceDate');
    const attendanceTimeInput = document.getElementById('attendanceTime');
    const loadAttendanceBtn = document.getElementById('loadAttendanceBtn');
    const studentAttendanceForms = document.getElementById('studentAttendanceForms');
    const displayDateSpan = document.getElementById('displayDate');

    // Set today's date and current time as default on load
    const today = new Date();
    const formattedDate = today.toISOString().split('T')[0]; // YYYY-MM-DD
    const formattedTime = today.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }); // HH:MM

    attendanceDateInput.value = formattedDate;
    attendanceTimeInput.value = formattedTime;
    updateDisplayDate(formattedDate); // Set initial display date

    // Helper function to update the displayed date text
    function updateDisplayDate(dateString) {
        const dateObj = new Date(dateString);
        // Ensure dateObj is valid before formatting
        if (isNaN(dateObj)) {
            displayDateSpan.textContent = 'Invalid Date';
        } else {
            displayDateSpan.textContent = dateObj.toLocaleDateString('en-US', {
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
            });
        }
    }

    // Function to fetch and render attendance forms/summary
    const renderAttendanceForms = async (date) => {
        studentAttendanceForms.innerHTML = '<p class="text-center text-gray-500">Loading attendance data...</p>';
        updateDisplayDate(date); // Update display date in the heading

        console.log(`Fetching attendance for date: ${date}`);

        try {
            const response = await fetch(`/attendance/summary?date=${date}`);
            
            // Check for HTTP errors (e.g., 401 Unauthorized, 500 Internal Server Error)
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: 'No JSON response', detail: response.statusText }));
                console.error(`HTTP Error! Status: ${response.status}`, errorData);
                studentAttendanceForms.innerHTML = `
                    <p class="text-center text-red-500 p-4 bg-red-100 rounded-lg border border-red-200">
                        Error loading attendance (HTTP ${response.status}): ${errorData.message || 'Server error'}. Please check your server logs.
                    </p>
                `;
                return; // Stop execution
            }

            const result = await response.json();
            
            // Log the full API response for debugging
            console.log("Attendance Summary API Response:", result);

            if (result.success) {
                const summary = result.summary;

                // Scenario 1: No students fetched for this teacher OR no attendance records for the date
                if (!summary || summary.length === 0) {
                    studentAttendanceForms.innerHTML = `
                        <p class="text-center text-gray-600 italic p-4 bg-green-100 rounded-lg border border-green-200">
                            No students found for this teacher, or no attendance has been recorded for ${displayDateSpan.textContent}.
                        </p>
                    `;
                    return; // Stop execution
                }

                // Scenario 2: Data successfully loaded, render students
                studentAttendanceForms.innerHTML = ''; // Clear previous content

                summary.forEach(student => {
                    const studentDiv = document.createElement('div');
                    studentDiv.className = 'student-attendance-card p-4 rounded-lg shadow-sm border flex items-center justify-between transition-transform transform hover:scale-[1.01]';

                    let contentHtml = '';
                    let cardBgClasses = []; // Array to hold classes for the overall card background
                    let statusIcon = '';

                    // Check if any attendance record exists for this student for the selected date
                    if (student.attendance_records && student.attendance_records.length > 0) {
                        // Attendance has been marked for this student for this date.
                        // We will display the status of the LAST recorded attendance for the day.
                        const lastRecord = student.attendance_records[student.attendance_records.length - 1];
                        const status = lastRecord.status.toLowerCase();
                        let displayStatusText = '';

                        if (status === 'present') {
                            cardBgClasses = ['bg-green-100', 'border-green-300'];
                            statusIcon = '<i class="fas fa-check-circle mr-2 text-green-500"></i>';
                            displayStatusText = 'Present';
                        } else if (status === 'absent') {
                            cardBgClasses = ['bg-red-100', 'border-red-300'];
                            statusIcon = '<i class="fas fa-times-circle mr-2 text-red-500"></i>';
                            displayStatusText = 'Absent';
                        } else { // Fallback for unexpected status
                            cardBgClasses = ['bg-gray-100', 'border-gray-300'];
                            statusIcon = '<i class="fas fa-question-circle mr-2 text-gray-500"></i>';
                            displayStatusText = 'Unknown Status';
                        }
                        
                        // Apply background and text color classes
                        studentDiv.classList.add(...cardBgClasses, 'text-gray-700'); // FIX IS HERE: Spread the array
                        // Old line causing error: studentDiv.classList.add(cardBgClass, 'text-gray-700');

                        contentHtml = `
                            <span class="text-lg font-medium flex items-center">
                                ${statusIcon} ${student.student_name}
                            </span>
                            <span class="font-bold text-xl">${displayStatusText}</span>
                        `;

                    } else {
                        // Attendance is NOT marked for this student for this date (show buttons)
                        studentDiv.classList.add('bg-white', 'border-gray-200', 'text-gray-800'); // Default styling for unmarked
                        contentHtml = `
                            <p class="font-semibold text-lg mr-4 flex-grow"><i class="fas fa-user-circle mr-2 text-blue-500"></i>${student.student_name}</p>
                            <div class="flex space-x-2">
                                <button
                                    data-student-id="${student.student_id}"
                                    data-status="present"
                                    class="mark-btn btn-present bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-md transition-all duration-200 ease-in-out flex items-center"
                                >
                                    <i class="fas fa-check mr-1"></i> Present
                                </button>
                                <button
                                    data-student-id="${student.student_id}"
                                    data-status="absent"
                                    class="mark-btn btn-absent bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-md transition-all duration-200 ease-in-out flex items-center"
                                >
                                    <i class="fas fa-times mr-1"></i> Absent
                                </button>
                            </div>
                        `;
                    }
                    
                    studentDiv.innerHTML = contentHtml;
                    studentAttendanceForms.appendChild(studentDiv);
                });

                // Attach event listeners ONLY to the newly created mark buttons
                document.querySelectorAll('.mark-btn').forEach(button => {
                    button.addEventListener('click', handleMarkAttendance);
                });

            } else {
                // This block handles cases where result.success is false (server-side error message)
                console.error("API response success: false", result.message);
                studentAttendanceForms.innerHTML = `
                    <p class="text-center text-red-500 p-4 bg-red-100 rounded-lg border border-red-200">
                        Error from server: ${result.message || 'An unknown error occurred'}.
                    </p>
                `;
            }
        } catch (error) {
            // This catches network errors, JSON parsing errors, or unexpected client-side issues
            console.error('Error in renderAttendanceForms (catch block):', error);
            studentAttendanceForms.innerHTML = `
                <p class="text-center text-red-500 p-4 bg-red-100 rounded-lg border border-red-200">
                    Failed to load attendance data. Please check your network connection and browser console.
                </p>
            `;
        }
    };

    // Function to handle marking attendance
    const handleMarkAttendance = async (event) => {
        const button = event.currentTarget;
        const studentId = button.dataset.studentId;
        const status = button.dataset.status;
        const attendanceDate = attendanceDateInput.value;
        const attendanceTime = attendanceTimeInput.value; // Important: use the time from the input

        // Disable all mark buttons for this student temporarily
        const studentButtons = document.querySelectorAll(`.mark-btn[data-student-id="${studentId}"]`);
        studentButtons.forEach(btn => btn.disabled = true);

        console.log(`Marking attendance for student ${studentId}: Date=${attendanceDate}, Time=${attendanceTime}, Status=${status}`);

        try {
            const response = await fetch('/attendance/mark', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ studentId, attendanceDate, attendanceTime, status }),
            });
            const result = await response.json();

            // Log API response for marking attendance
            console.log("Mark Attendance API Response:", result);

            if (result.success) {
                // Re-render the attendance forms to update the UI
                // This will re-fetch data and hide buttons for the student just marked
                renderAttendanceForms(attendanceDate);
            } else {
                console.error('Failed to mark attendance:', result.message);
                alert('Error marking attendance: ' + result.message);
                studentButtons.forEach(btn => btn.disabled = false); // Re-enable buttons on failure
            }
        } catch (error) {
            console.error('Network error marking attendance (catch block):', error);
            alert('Network error marking attendance. Please check your connection.');
            studentButtons.forEach(btn => btn.disabled = false); // Re-enable buttons on failure
        }
    };

    // Event listener for the "Load Attendance" button
    if (loadAttendanceBtn) {
        loadAttendanceBtn.addEventListener('click', () => {
            renderAttendanceForms(attendanceDateInput.value);
        });
    }

    // Initial load of attendance for today's date when the page loads
    if (attendanceDateInput) {
        renderAttendanceForms(attendanceDateInput.value);
    }
});