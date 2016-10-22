function countElementInArray(array, toFind) {
    let count = 0;

    array.map(function(elem, index) {
        if(elem == toFind) {
            count++;
        }
    });

    return count;
}

function secondsToHumanTime(inputTime) {
    let minutes = Math.floor(inputTime / 60);
    let seconds = inputTime % 60;
    if (seconds < 10) {
        seconds = '0' + seconds;
    }

    return minutes + ':' + seconds;
}

/*
https://www.youtube.com/watch?v=JpiaNJxz_SU t=70
https://www.youtube.com/watch?v=c3DzmgPpOu8 t=220
https://www.youtube.com/watch?v=9SbsyjrLnhE t=300
*/
