function switchPageCreate() {
    const sign = document.getElementById('signInBox');
    const create = document.getElementById('createAccountBox');
    const staff = document.getElementById('staffBox');

    sign.style.opacity = '0';
    sign.style.pointerEvents = 'none';

    staff.style.opacity = '0';
    staff.style.pointerEvents = 'none';

    create.style.opacity = '1';
    create.style.pointerEvents = 'auto';
}

function switchPageSign() {
    const sign = document.getElementById('signInBox');
    const create = document.getElementById('createAccountBox');

    create.style.opacity = '0';
    create.style.pointerEvents = 'none';

    sign.style.opacity = '1';
    sign.style.pointerEvents = 'auto';
}

function switchPageOwner(){
    const create = document.getElementById('createAccountBox');
    const staff = document.getElementById('staffBox');
    create.style.opacity = '0';
    create.style.pointerEvents = 'none';

    staff.style.opacity = '1';
    staff.style.pointerEvents = 'auto';
}