import React from 'react';
import { Card } from 'react-bootstrap';

const BulkPDF = () => {
    return (
        <div className="bulk-pdf">
            {/* Teacher Card */}
            <Card className="teacher-card">
                <Card.Img variant="left" src="path/to/color-photo.jpg" width="20" height="24" />
                <Card.Body>
                    <Card.Title>Class Teacher</Card.Title>
                    <Card.Text>
                        {/* Class Teacher details */}
                    </Card.Text>
                </Card.Body>
            </Card>
            {/* Headteacher Card */}
            <Card className="headteacher-card">
                <Card.Img variant="left" src="path/to/grayscale-photo.jpg" width="20" height="24" />
                <Card.Body>
                    <Card.Title>Head Teacher</Card.Title>
                    <Card.Text>
                        {/* Head Teacher details */}
                    </Card.Text>
                </Card.Body>
            </Card>
        </div>
    );
};

export default BulkPDF;