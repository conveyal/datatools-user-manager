import React from 'react'

import { Navbar, Nav, NavItem, NavDropdown, MenuItem } from 'react-bootstrap'

export default class NavigationBar extends React.Component {

  constructor (props) {
    super(props)
  }

  render () {

    var userControl;
    if (!this.props.profile) {
      userControl = <NavItem onClick={this.props.logIn} href="#">Log In</NavItem>
    } else {
      userControl =
        <NavDropdown title={this.props.profile.email} id="basic-nav-dropdown">
          <MenuItem>Settings..</MenuItem>
          <MenuItem onClick={this.props.logOut}>Log Out</MenuItem>
        </NavDropdown>
    }

    return (
      <Navbar inverse>
        <Navbar.Header>
          <Navbar.Brand>
            <a href="#">{this.props.title}</a>
          </Navbar.Brand>
        </Navbar.Header>
        <Nav pullRight>
          <NavItem href="#">Admin</NavItem>
          <NavItem href="#">Documentation</NavItem>
          {userControl}
        </Nav>
      </Navbar>
    )
  }
}
