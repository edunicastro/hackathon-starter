import React, { Component } from 'react';
import { BrowserRouter, Route } from 'react-router-dom';
import { connect } from 'react-redux';
import * as actions from '../actions';
import { Container } from 'semantic-ui-react';

import Header from './Header';
const Dashboard = () => <h2>Dashboard</h2>;
const SurveyNew = () => <h2>SurveyNew</h2>;
const Landing = () => <h2>Landing</h2>;

class App extends Component {
	componentDidMount() {
		this.props.fetchUser();
	}

	render() {
		return (
			<BrowserRouter>
				<Container>
					<Header />
					<Route exact path="/" component={Landing} />
					<Route exact path="/surveys" component={Dashboard} />
					<Route path="/surveys/new" component={SurveyNew} />
				</Container>
			</BrowserRouter>
		);
	}
}

export default connect(null, actions)(App);
