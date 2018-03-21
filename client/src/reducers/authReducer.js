export default function(state = {}, action) {
	console.log(action);
	switch (action.type) {
		case 'expression':
			break;
		default:
			return state;
	}
}
