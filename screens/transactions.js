import React, {Component} from 'react';
import {ToastAndroid, Text, StyleSheet, TouchableOpacity, Image, ImageBackground, TextInput, Alert} from 'react-native';
import * as Permissions from "expo-permissions";
import {BarCodeScanner} from "expo-barcode-scanner";
import db from '../config';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { KeyboardAvoidingView } from 'react-native';
const bgImage = require("../assets/background2.png");
const appIcon = require("../assets/appIcon.png");
const appName = require("../assets/appName.png");

export default class Transactions extends Component
{
  constructor(props)
  {
    super(props);
    this.state={
      domState: "normal",
      hasCameraPermissions: null,
      scanned: false,
      scannedData: "",
      bookId: "",
      studentId: ""
    }
  }
  
  getCameraPermissions=async(domState)=>{
    const {status} = await Permissions.askAsync(Permissions.CAMERA)
    this.setState({
      hasCameraPermissions:status==="granted",
      domState: domState, 
      scanned: false
    })
  }
  
  handleBarCodeScanned=async({type, data})=>{
    const {domState} = this.state;
    if(domState==="bookId")
    {
      this.setState({
      bookId: data,
      domState: 'normal',
      scanned: true
    })
  }
    else if(domState==="studentId"){
      this.setState({
        studentId:data,
        domState:'normal',
        scanned: true
      })
    }
    
    
  }

  getStudentDetails=async(studentId)=>
  {
    studentId = studentId.trim();
    let dbQuery = query(
      collection(db,'students' )
    );
    let studentRef = await getDocs(dbQuery);
    studentRef.forEach((doc)=>{
      this.setState({
        studentName: doc.data().student_name
      })
    })
  }

  getBookDetails=async(bookId)=>
  {
    bookId = bookId.trim();
    let dbQuery = query(
      collection(db,'books' )
    );
    let bookRef = await getDocs(dbQuery);
    bookRef.forEach((doc)=>{
      this.setState({
        bookName: doc.data().book_name
      })
    })
  }

  handleTransaction=async()=>{
    var { bookId, studentId } = this.state;
		await this.getBookDetails(bookId);
		await this.getStudentDetails(studentId);

		let dbQuery = query(
			collection(db, 'books'),
			where('book_id', '==', bookId)
		);

		let bookRef = await getDocs(dbQuery);

		bookRef.forEach((doc) => {
			var book = doc.data();
			if (book.is_book_available) {
				var { bookName, studentName } = this.state;
				this.initiateBookIssue(bookId, studentId, bookName, studentName);

				Alert.alert('Book issued to the student!');
        // For Android users only
				// ToastAndroid.show('Book issued to the student!', ToastAndroid.SHORT);
			} else {
				var { bookName, studentName } = this.state;
				this.initiateBookReturn(bookId, studentId, bookName, studentName);

				

				Alert.alert('Book returned to the library!');
        // For Android users only
				// ToastAndroid.show('Book returned to the library!', ToastAndroid.SHORT);
			}
		});
  }
  initiateBookReturn=async(bookId, studentId, bookName, studentName)=>{
    const docRef = await addDoc(collection(db, 'transactions'), 
    {
      student_Id : studentId,
      student_name: studentName,
      book_Id : bookId,
      book_name: bookName,
      date : Timestamp.fromDate(new Date()),
      TransactionType: 'return'
    }
    );
    const bookRef = doc(db, 'books', bookId);
    await updateDoc(bookRef, {
      is_book_available : true
    });

    const studentRef = doc(db, 'students', studentId);
    await updateDoc(studentRef, {
      number_of_books_issues : increment(-1)
    });
    
    this.setState({
      bookId: '',
      studentId: ''
    })
    
  }
  initiateBookIssue=async(bookId, studentId, bookName, studentName)=>{
    const docRef = await addDoc(collection(db, 'transactions'), 
    {
      student_Id : studentId,
      student_name: studentName,
      book_Id : bookId,
      book_name: bookName,
      date : Timestamp.fromDate(new Date()),
      TransactionType: 'issue'
    }
    );
    const bookRef = doc(db, 'books', bookId);
    await updateDoc(bookRef, {
      is_book_available : false
    });

    const studentRef = doc(db, 'students', studentId);
    await updateDoc(studentRef, {
      number_of_books_issues : increment(1)
    });

    this.setState({
      bookId: '',
      studentId: ''
    })
  }
  
  render() {
		const { bookId, studentId, domState, scanned } = this.state;
		if (domState !== 'normal') {
			return (
				<BarCodeScanner
					onBarCodeScanned={scanned ? undefined : this.handleBarCodeScanned}
					style={StyleSheet.absoluteFillObject}
				/>
			);
		}
		return (
			<KeyboardAvoidingView behavior='padding' style={styles.container}>
				<ImageBackground source={bgImage} style={styles.bgImage}>
					<View style={styles.upperContainer}>
						<Image source={appIcon} style={styles.appIcon} />
						<Image source={appName} style={styles.appName} />
					</View>
					<View style={styles.lowerContainer}>
						<View style={styles.textinputContainer}>
							<TextInput
								style={styles.textinput}
								placeholder={'Book Id'}
								placeholderTextColor={'#FFFFFF'}
								value={bookId}
								onChangeText={(text) => this.setState({ bookId: text })}
							/>
							<TouchableOpacity
								style={styles.scanbutton}
								onPress={() => this.getCameraPermissions('bookId')}>
								<Text style={styles.scanbuttonText}>Scan</Text>
							</TouchableOpacity>
						</View>
						<View style={[styles.textinputContainer, { marginTop: 25 }]}>
							<TextInput
								style={styles.textinput}
								placeholder={'Student Id'}
								placeholderTextColor={'#FFFFFF'}
								value={studentId}
								onChangeText={(text) => this.setState({ studentId: text })}
							/>
							<TouchableOpacity
								style={styles.scanbutton}
								onPress={() => this.getCameraPermissions('studentId')}>
								<Text style={styles.scanbuttonText}>Scan</Text>
							</TouchableOpacity>
						</View>
						<TouchableOpacity
							style={[styles.button, { marginTop: 25 }]}
							onPress={this.handleTransaction}>
							<Text style={styles.buttonText}>Submit</Text>
						</TouchableOpacity>
					</View>
				</ImageBackground>
			</KeyboardAvoidingView>
		);
	}
}
  

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF"
  },
  bgImage: {
    flex: 1,
    resizeMode: "cover",
    justifyContent: "center"
  },
  upperContainer: {
    flex: 0.5,
    justifyContent: "center",
    alignItems: "center"
  },
  appIcon: {
    width: 200,
    height: 200,
    resizeMode: "contain",
    marginTop: 80
  },
  appName: {
    width: 80,
    height: 80,
    resizeMode: "contain"
  },
  lowerContainer: {
    flex: 0.5,
    alignItems: "center",
    marginTop: 25
  },
  textinputContainer: {
    borderWidth: 2,
    borderRadius: 10,
    flexDirection: "row",
    backgroundColor: "#9DFD24",
    borderColor: "#FFFFFF"
  },
  textinput: {
    width: "57%",
    height: 50,
    padding: 10,
    borderColor: "#FFFFFF",
    borderRadius: 10,
    borderWidth: 3,
    fontSize: 18,
    backgroundColor: "#5653D4",
    fontFamily: "Rajdhani_600SemiBold",
    color: "#FFFFFF"
  },
  scanbutton: {
    width: 100,
    height: 50,
    backgroundColor: "#9DFD24",
    borderTopRightRadius: 10,
    borderBottomRightRadius: 10,
    justifyContent: "center",
    alignItems: "center"
  },
  scanbuttonText: {
    fontSize: 24,
    color: "#0A0101",
    fontFamily: "Rajdhani_600SemiBold"
  },
  button: {
		width: '43%',
		height: 55,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: '#F48D20',
		borderRadius: 15,
	},
	buttonText: {
		fontSize: 24,
		color: '#FFFFFF',
		fontFamily: 'Rajdhani_600SemiBold',
	},
});
