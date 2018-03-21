import React, { Component } from 'react';
import { connect } from 'react-redux';
import { Link } from 'react-router-dom';
import { Button, Container, Menu } from 'semantic-ui-react';

class Header extends Component {
	state = { activeItem: 'home' };
	handleItemClick = (e, { name }) => this.setState({ activeItem: name });

	renderContent(activeItem) {
		switch (this.props.auth) {
			case null:
				return;
			case false:
				return (
					<Menu.Item position="right">
						<Button as="a">Log in</Button>
						<Button as="a" style={{ marginLeft: '0.5em' }}>
							Sign Up
						</Button>
					</Menu.Item>
				);
			default:
				return [
					<Menu.Item
						name="base"
						active={activeItem === 'base'}
						as="a"
						onClick={this.handleItemClick}
					>
						Base de Artigos
					</Menu.Item>,
					<Menu.Item
						name="analises"
						active={activeItem === 'analises'}
						as="a"
						onClick={this.handleItemClick}
					>
						Análises
					</Menu.Item>,
					<Menu.Item
						name="relatorios"
						active={activeItem === 'relatorios'}
						as="a"
						onClick={this.handleItemClick}
					>
						Relatórios
					</Menu.Item>,
					<Menu.Item position="right">
						<Button as="a">Logout</Button>
					</Menu.Item>
				];
		}
	}

	render() {
		const { activeItem } = this.state;

		return (
			<Menu size="large" style={{ marginTop: '0.5em' }}>
				<Container>
					<Menu.Item
						name="home"
						active={activeItem === 'home'}
						as="a"
						onClick={this.handleItemClick}
					>
						MC3R
					</Menu.Item>
					{this.renderContent(activeItem)}
				</Container>
			</Menu>
		);
	}
}

function mapStateToProps(state) {
	return { auth: state.auth };
}

export default connect(mapStateToProps)(Header);
